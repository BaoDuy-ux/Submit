package com.shop.sales_managment.auth;

public final class LoginIdentifierNormalizer {
    private LoginIdentifierNormalizer() {}

    public static String normalize(String raw) {
        if (raw == null) return "";
        String s = raw.trim();
        if (s.isBlank()) return "";
        if (s.contains("@")) {
            return s.toLowerCase();
        }
        s = s.replaceAll("[\\s.\\-()]", "");
        if (s.startsWith("+84")) {
            s = "0" + s.substring(3);
        } else if (s.startsWith("84") && s.length() >= 11) {
            s = "0" + s.substring(2);
        }
        return s;
    }
}
