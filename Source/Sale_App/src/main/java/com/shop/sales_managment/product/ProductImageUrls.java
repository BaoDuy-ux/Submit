package com.shop.sales_managment.product;

import java.util.List;
import java.util.Map;

/**
 * Ảnh thời trang theo danh mục (Unsplash, ổn định cho demo).
 */
public final class ProductImageUrls {
    private ProductImageUrls() {}

    private static final Map<String, List<String>> BY_CATEGORY = Map.of(
            "ao", List.of(
                    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1583743814966-6a5887bea9f2?w=400&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1622445275463-79d06148ebbf?w=400&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=300&fit=crop"
            ),
            "quan", List.of(
                    "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1473966960822-b2facc1c2b64?w=400&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&h=300&fit=crop"
            ),
            "vay", List.of(
                    "https://images.unsplash.com/photo-1595777453558-2b9c6b0c5c0e?w=400&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=400&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1591369822096-ffd140ec771f?w=400&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&h=300&fit=crop"
            ),
            "ao-khoac", List.of(
                    "https://images.unsplash.com/photo-1551028711-00167b16eac5?w=400&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=400&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=300&fit=crop"
            )
    );

    public static String forProduct(String category, String sku) {
        String cat = category != null ? category : "ao";
        List<String> pool = BY_CATEGORY.getOrDefault(cat, BY_CATEGORY.get("ao"));
        String key = sku != null && !sku.isBlank() ? sku : cat;
        int idx = Math.floorMod(key.hashCode(), pool.size());
        return pool.get(idx);
    }

    public static boolean needsFix(String image) {
        if (image == null || image.isBlank()) return true;
        String lower = image.toLowerCase();
        return lower.contains("picsum.photos")
                || lower.contains("via.placeholder")
                || lower.contains("placeholder.com");
    }
}
