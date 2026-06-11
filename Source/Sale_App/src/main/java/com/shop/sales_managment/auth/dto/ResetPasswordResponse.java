package com.shop.sales_managment.auth.dto;

public class ResetPasswordResponse {
    private boolean ok;
    private String message;

    public ResetPasswordResponse() {}

    public ResetPasswordResponse(boolean ok, String message) {
        this.ok = ok;
        this.message = message;
    }

    public boolean isOk() {
        return ok;
    }

    public void setOk(boolean ok) {
        this.ok = ok;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}

