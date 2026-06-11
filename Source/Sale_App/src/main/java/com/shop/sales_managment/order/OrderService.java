package com.shop.sales_managment.order;

import com.shop.sales_managment.auth.UserPrincipal;
import com.shop.sales_managment.entity.Product;
import com.shop.sales_managment.order.dto.CreateOrderItemRequest;
import com.shop.sales_managment.order.dto.CreateOrderRequest;
import com.shop.sales_managment.order.dto.OrderDto;
import com.shop.sales_managment.order.dto.UpdateOrderStatusRequest;
import com.shop.sales_managment.repository.iProductRepository;
import com.shop.sales_managment.user.Role;
import com.shop.sales_managment.user.User;
import com.shop.sales_managment.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class OrderService {
    private static final long DEFAULT_SHIPPING_FEE = 30_000L;

    private final OrderRepository orderRepository;
    private final iProductRepository productRepository;
    private final UserRepository userRepository;
    private final long shippingFee;

    public OrderService(
            OrderRepository orderRepository,
            iProductRepository productRepository,
            UserRepository userRepository,
            @Value("${app.order.shippingFee:30000}") long shippingFee
    ) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.shippingFee = shippingFee;
    }

    private UserPrincipal requirePrincipal(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal p)) {
            throw new IllegalStateException("Chưa đăng nhập");
        }
        return p;
    }

    private String nextOrderCode() {
        long next = orderRepository.maxId() + 1;
        return "DH" + String.format("%06d", next);
    }

    @Transactional
    public OrderDto createOrder(Authentication auth, CreateOrderRequest req) {
        UserPrincipal principal = requirePrincipal(auth);
        boolean isAdmin = principal.getRole() == Role.ADMIN;

        Order order = new Order();
        order.setOrderCode(nextOrderCode());
        order.setStatus(OrderStatus.PENDING);
        order.setCreatedAt(Instant.now());
        order.setCreatedByRole(isAdmin ? "admin" : "customer");
        order.setNote(req.getNote());
        order.setShippingFee(shippingFee);

        User customer = null;
        if (isAdmin) {
            order.setCustomerName(blankToNull(req.getCustomerName()) != null ? req.getCustomerName().trim() : "Khách lẻ");
            order.setCustomerPhone(blankToNull(req.getCustomerPhone()));
            order.setShippingAddress(blankToNull(req.getShippingAddress()));
        } else {
            customer = userRepository.findById(principal.getUserId())
                    .orElseThrow(() -> new IllegalStateException("Không tìm thấy tài khoản"));
            order.setCustomerId(customer.getId());
            order.setCustomerName(customer.getFullName() != null ? customer.getFullName() : customer.getUsername());
            order.setCustomerPhone(customer.getPhone());
            order.setShippingAddress(
                    blankToNull(req.getShippingAddress()) != null ? req.getShippingAddress().trim()
                            : (customer.getAddress() != null ? customer.getAddress() : "")
            );
        }

        long subtotal = 0;
        Map<Long, Product> productCache = new HashMap<>();

        for (CreateOrderItemRequest line : req.getItems()) {
            Product product = productRepository.findById(line.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException("Sản phẩm không tồn tại: " + line.getProductId()));

            String size = normalizeVariant(line.getSize());
            String color = normalizeVariant(line.getColor());
            int qty = Math.max(1, line.getQty());

            int available = getStock(product, size);
            if (available < qty) {
                throw new IllegalArgumentException(
                        "Không đủ tồn kho cho \"" + product.getName() + "\" size " + size + " (còn " + available + ")"
                );
            }

            deductStock(product, size, qty);
            productCache.put(product.getId(), product);

            long unitPrice = product.getPrice();
            long lineTotal = unitPrice * qty;
            subtotal += lineTotal;

            OrderItem item = new OrderItem();
            item.setProductId(product.getId());
            item.setProductName(product.getName());
            item.setSku(product.getSku());
            item.setUnitPrice(unitPrice);
            item.setQty(qty);
            item.setSize(size);
            item.setColor(color);
            item.setLineTotal(lineTotal);
            item.setImage(product.getImage());
            order.addItem(item);
        }

        productRepository.saveAll(productCache.values());

        order.setSubtotal(subtotal);
        order.setTotal(subtotal + (subtotal > 0 ? shippingFee : 0));

        Order saved = orderRepository.save(order);
        return OrderMapper.toDto(saved, true);
    }

    @Transactional(readOnly = true)
    public List<OrderDto> listOrders(Authentication auth, String statusFilter) {
        UserPrincipal principal = requirePrincipal(auth);
        OrderStatus status = statusFilter != null && !statusFilter.isBlank()
                ? OrderStatus.fromApi(statusFilter) : null;

        List<Order> orders;
        if (principal.getRole() == Role.ADMIN) {
            orders = status != null
                    ? orderRepository.findByStatusOrderByCreatedAtDesc(status)
                    : orderRepository.findAllByOrderByCreatedAtDesc();
        } else {
            orders = orderRepository.findByCustomerIdOrderByCreatedAtDesc(principal.getUserId());
            if (status != null) {
                orders = orders.stream().filter(o -> o.getStatus() == status).toList();
            }
        }
        return OrderMapper.toDtoList(orders, false);
    }

    @Transactional(readOnly = true)
    public OrderDto getOrder(Authentication auth, Long id) {
        UserPrincipal principal = requirePrincipal(auth);
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng"));

        if (principal.getRole() != Role.ADMIN
                && (order.getCustomerId() == null || !order.getCustomerId().equals(principal.getUserId()))) {
            throw new IllegalStateException("Không có quyền xem đơn hàng này");
        }
        return OrderMapper.toDto(order, true);
    }

    @Transactional
    public OrderDto updateStatus(Long id, UpdateOrderStatusRequest req) {
        OrderStatus newStatus = OrderStatus.fromApi(req.getStatus());
        if (newStatus == null) throw new IllegalArgumentException("Trạng thái không hợp lệ");

        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng"));

        OrderStatus old = order.getStatus();
        if (old == OrderStatus.CANCELLED) {
            throw new IllegalArgumentException("Đơn đã hủy, không thể đổi trạng thái");
        }

        if (newStatus == OrderStatus.CANCELLED && old != OrderStatus.CANCELLED) {
            restoreStock(order);
        }

        order.setStatus(newStatus);
        return OrderMapper.toDto(orderRepository.save(order), true);
    }

    private void restoreStock(Order order) {
        for (OrderItem line : order.getItems()) {
            productRepository.findById(line.getProductId()).ifPresent(p -> {
                addStock(p, line.getSize(), line.getQty());
                productRepository.save(p);
            });
        }
    }

    private static String normalizeVariant(String v) {
        if (v == null || v.isBlank() || "default".equalsIgnoreCase(v.trim())) return "default";
        return v.trim();
    }

    private static int getStock(Product p, String size) {
        Map<String, Integer> map = p.getStockBySize();
        if (map == null || map.isEmpty()) return 0;
        Integer n = map.get(size);
        if (n == null && "default".equals(size)) {
            return map.values().stream().mapToInt(Integer::intValue).sum();
        }
        return n != null ? n : 0;
    }

    private static void deductStock(Product p, String size, int qty) {
        Map<String, Integer> map = p.getStockBySize();
        if (map == null) map = new HashMap<>();
        else map = new HashMap<>(map);

        if ("default".equals(size) && !map.containsKey("default")) {
            int total = map.values().stream().mapToInt(Integer::intValue).sum();
            if (total < qty) throw new IllegalArgumentException("Không đủ tồn kho");
            int remain = qty;
            for (String key : map.keySet().stream().sorted().toList()) {
                int have = map.getOrDefault(key, 0);
                int take = Math.min(have, remain);
                map.put(key, have - take);
                remain -= take;
                if (remain <= 0) break;
            }
        } else {
            int have = map.getOrDefault(size, 0);
            map.put(size, Math.max(0, have - qty));
        }
        p.setStockBySize(map);
    }

    private static void addStock(Product p, String size, int qty) {
        Map<String, Integer> map = p.getStockBySize();
        if (map == null) map = new HashMap<>();
        else map = new HashMap<>(map);
        map.put(size, map.getOrDefault(size, 0) + qty);
        p.setStockBySize(map);
    }

    private static String blankToNull(String s) {
        if (s == null || s.isBlank()) return null;
        return s;
    }

    public static String formatDateVi(Instant instant) {
        if (instant == null) return "";
        return DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
                .withZone(ZoneId.of("Asia/Ho_Chi_Minh"))
                .format(instant);
    }
}
