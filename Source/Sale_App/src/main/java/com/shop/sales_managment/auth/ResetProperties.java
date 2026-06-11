package com.shop.sales_managment.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.reset")
public class ResetProperties {
    private boolean exposeToken;
    private long expiresMinutes;

    public boolean isExposeToken() {
        return exposeToken;
    }

    public void setExposeToken(boolean exposeToken) {
        this.exposeToken = exposeToken;
    }

    public long getExpiresMinutes() {
        return expiresMinutes;
    }

    public void setExpiresMinutes(long expiresMinutes) {
        this.expiresMinutes = expiresMinutes;
    }
}

