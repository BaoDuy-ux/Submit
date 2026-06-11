package com.shop.sales_managment.auth.dto;

public class ForgotPasswordResponse {
    private boolean ok;
    private String message;
    private String resetToken; // only when explicitly exposed for local/dev

    public ForgotPasswordResponse() {}

    public ForgotPasswordResponse(boolean ok, String message, String resetToken) {
        this.ok = ok;
        this.message = message;
        this.resetToken = resetToken;
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

    public String getResetToken() {
        return resetToken;
    }

    public void setResetToken(String resetToken) {
        this.resetToken = resetToken;
    }
}

