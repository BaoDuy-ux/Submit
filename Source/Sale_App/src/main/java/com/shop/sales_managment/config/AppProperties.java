package com.shop.sales_managment.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.jwt")
public class AppProperties {
    private String secret;
    private long expiresMinutes;

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public long getExpiresMinutes() {
        return expiresMinutes;
    }

    public void setExpiresMinutes(long expiresMinutes) {
        this.expiresMinutes = expiresMinutes;
    }
}

