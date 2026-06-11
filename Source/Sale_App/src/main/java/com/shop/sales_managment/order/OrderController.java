package com.shop.sales_managment.order;

import com.shop.sales_managment.order.dto.CreateOrderRequest;
import com.shop.sales_managment.order.dto.OrderDto;
import com.shop.sales_managment.order.dto.UpdateOrderStatusRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderDto create(@Valid @RequestBody CreateOrderRequest req, Authentication auth) {
        return orderService.createOrder(auth, req);
    }

    @GetMapping
    public List<OrderDto> list(
            @RequestParam(required = false) String status,
            Authentication auth
    ) {
        return orderService.listOrders(auth, status);
    }

    @GetMapping("/{id}")
    public OrderDto get(@PathVariable Long id, Authentication auth) {
        return orderService.getOrder(auth, id);
    }

    @PutMapping("/{id}/status")
    public OrderDto updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateOrderStatusRequest req
    ) {
        return orderService.updateStatus(id, req);
    }
}
