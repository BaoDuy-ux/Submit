package com.shop.sales_managment.order;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {
    Optional<Order> findByOrderCode(String orderCode);

    List<Order> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<Order> findAllByOrderByCreatedAtDesc();

    List<Order> findByStatusOrderByCreatedAtDesc(OrderStatus status);

    @Query("SELECT COALESCE(MAX(o.id), 0) FROM Order o")
    long maxId();
}
