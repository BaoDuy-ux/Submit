package com.shop.sales_managment.user;

import java.util.Locale;

public enum Role {
    ADMIN,
    CUSTOMER;

    public static Role fromApi(String value) {
        if (value == null) return null;
        String v = value.trim().toLowerCase(Locale.ROOT);
        return switch (v) {
            case "admin" -> ADMIN;
            case "customer" -> CUSTOMER;
            default -> null;
        };
    }

    public String toApi() {
        return switch (this) {
            case ADMIN -> "admin";
            case CUSTOMER -> "customer";
        };
    }
}

