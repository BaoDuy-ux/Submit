package com.shop.sales_managment.auth.dto;

import jakarta.validation.constraints.NotBlank;

public class ForgotPasswordRequest {
    /** customer | admin — mặc định customer nếu bỏ trống */
    private String role;

    @NotBlank(message = "Vui lòng nhập tài khoản / email / số điện thoại")
    private String identifier;

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getIdentifier() {
        return identifier;
    }

    public void setIdentifier(String identifier) {
        this.identifier = identifier;
    }
}

