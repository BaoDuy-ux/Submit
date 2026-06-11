package com.shop.sales_managment.order;

import com.shop.sales_managment.order.dto.OrderDto;
import com.shop.sales_managment.order.dto.OrderItemDto;

import java.util.List;
import java.util.stream.Collectors;

public final class OrderMapper {
    private OrderMapper() {}

    public static OrderDto toDto(Order o, boolean includeItems) {
        OrderDto dto = new OrderDto();
        dto.setId(o.getId());
        dto.setOrderCode(o.getOrderCode());
        dto.setCustomerId(o.getCustomerId());
        dto.setCustomerName(o.getCustomerName());
        dto.setCustomerPhone(o.getCustomerPhone());
        dto.setShippingAddress(o.getShippingAddress());
        if (o.getStatus() != null) {
            dto.setStatus(o.getStatus().toApi());
            dto.setStatusLabel(o.getStatus().toLabelVi());
        }
        dto.setSubtotal(o.getSubtotal());
        dto.setShippingFee(o.getShippingFee());
        dto.setTotal(o.getTotal());
        dto.setNote(o.getNote());
        dto.setCreatedByRole(o.getCreatedByRole());
        dto.setCreatedAt(o.getCreatedAt());

        if (o.getItems() != null && !o.getItems().isEmpty()) {
            dto.setItemsSummary(o.getItems().stream()
                    .map(OrderItem::getProductName)
                    .limit(3)
                    .collect(Collectors.joining(", "))
                    + (o.getItems().size() > 3 ? "..." : ""));
            if (includeItems) {
                dto.setItems(o.getItems().stream().map(OrderMapper::toItemDto).toList());
            }
        }
        return dto;
    }

    public static OrderItemDto toItemDto(OrderItem i) {
        OrderItemDto dto = new OrderItemDto();
        dto.setId(i.getId());
        dto.setProductId(i.getProductId());
        dto.setProductName(i.getProductName());
        dto.setSku(i.getSku());
        dto.setUnitPrice(i.getUnitPrice());
        dto.setQty(i.getQty());
        dto.setSize(i.getSize());
        dto.setColor(i.getColor());
        dto.setLineTotal(i.getLineTotal());
        dto.setImage(i.getImage());
        return dto;
    }

    public static List<OrderDto> toDtoList(List<Order> orders, boolean includeItems) {
        return orders.stream().map(o -> toDto(o, includeItems)).toList();
    }
}
