package com.shop.sales_managment.order;

import java.util.Locale;

public enum OrderStatus {
    PENDING,
    SHIPPING,
    COMPLETED,
    CANCELLED;

    public static OrderStatus fromApi(String value) {
        if (value == null) return null;
        String v = value.trim().toLowerCase(Locale.ROOT);
        return switch (v) {
            case "pending", "processing", "dang-xu-ly", "đang xử lý" -> PENDING;
            case "shipping", "dang-giao", "đang giao" -> SHIPPING;
            case "completed", "hoan-thanh", "hoàn thành", "done" -> COMPLETED;
            case "cancelled", "canceled", "da-huy", "đã hủy" -> CANCELLED;
            default -> null;
        };
    }

    public String toApi() {
        return name().toLowerCase(Locale.ROOT);
    }

    public String toLabelVi() {
        return switch (this) {
            case PENDING -> "Đang xử lý";
            case SHIPPING -> "Đang giao";
            case COMPLETED -> "Hoàn thành";
            case CANCELLED -> "Đã hủy";
        };
    }
}
