package com.shop.sales_managment.product;

import com.shop.sales_managment.entity.Product;
import com.shop.sales_managment.repository.iProductRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Sửa ảnh sản phẩm placeholder/picsum → ảnh thời trang theo danh mục.
 */
@Component
@Order(20)
public class ProductImageFixRunner implements CommandLineRunner {
    private final iProductRepository productRepository;
    private final boolean enabled;

    public ProductImageFixRunner(
            iProductRepository productRepository,
            @Value("${app.seed.fixProductImages:true}") boolean enabled
    ) {
        this.productRepository = productRepository;
        this.enabled = enabled;
    }

    @Override
    public void run(String... args) {
        if (!enabled) return;
        int fixed = 0;
        for (Product p : productRepository.findAll()) {
            if (ProductImageUrls.needsFix(p.getImage())) {
                p.setImage(ProductImageUrls.forProduct(p.getCategory(), p.getSku()));
                productRepository.save(p);
                fixed++;
            }
        }
        if (fixed > 0) {
            System.out.println("[ProductImageFix] Updated " + fixed + " product image(s).");
        }
    }
}
