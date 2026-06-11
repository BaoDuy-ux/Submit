package com.shop.sales_managment.auth.dto;

public class CheckAvailabilityResponse {
    private String field;
    private boolean available;
    private String message;

    public CheckAvailabilityResponse() {}

    public CheckAvailabilityResponse(String field, boolean available, String message) {
        this.field = field;
        this.available = available;
        this.message = message;
    }

    public String getField() {
        return field;
    }

    public void setField(String field) {
        this.field = field;
    }

    public boolean isAvailable() {
        return available;
    }

    public void setAvailable(boolean available) {
        this.available = available;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
