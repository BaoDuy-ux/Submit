package com.shop.sales_managment.config;

import com.shop.sales_managment.entity.Product;
import com.shop.sales_managment.product.ProductImageUrls;
import com.shop.sales_managment.repository.iProductRepository;
import com.shop.sales_managment.user.Role;
import com.shop.sales_managment.user.User;
import com.shop.sales_managment.user.UserRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.CommandLineRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.List;
import java.util.Map;

@Component
@ConditionalOnProperty(prefix = "app.seed", name = "enabled", havingValue = "true")
public class DataSeeder implements CommandLineRunner {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final iProductRepository productRepository;
    private final boolean seedProducts;
    private final int seedProductsCount;
    private final SecureRandom random = new SecureRandom();

    public DataSeeder(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            iProductRepository productRepository,
            @Value("${app.seed.products:false}") boolean seedProducts,
            @Value("${app.seed.productsCount:100}") int seedProductsCount
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.productRepository = productRepository;
        this.seedProducts = seedProducts;
        this.seedProductsCount = seedProductsCount;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            User admin = new User();
            admin.setRole(Role.ADMIN);
            admin.setUsername("admin");
            admin.setPasswordHash(passwordEncoder.encode("admin123"));
            admin.setFullName("Admin");
            admin.setPhone("0900000000");
            admin.setEmail("admin@shop.local");
            admin.setAddress("");
            userRepository.save(admin);

            User customer = new User();
            customer.setRole(Role.CUSTOMER);
            customer.setUsername("0900000000");
            customer.setPasswordHash(passwordEncoder.encode("123456"));
            customer.setFullName("Khách hàng");
            customer.setPhone("0900000000");
            customer.setEmail("");
            customer.setAddress("");
            userRepository.save(customer);
        }

        if (seedProducts) {
            long existing = productRepository.count();
            int target = Math.max(0, seedProductsCount);
            if (existing < target) {
                int toCreate = target - (int) existing;
                for (int i = 0; i < toCreate; i++) {
                    Product p = randomProduct((int) existing + i + 1);
                    // ensure SKU unique
                    while (productRepository.findBySku(p.getSku()).isPresent()) {
                        p.setSku(p.getSku() + random.nextInt(9));
                    }
                    productRepository.save(p);
                }
            }
        }
    }

    private Product randomProduct(int n) {
        String[] categories = {"ao", "quan", "vay", "ao-khoac"};
        String category = categories[random.nextInt(categories.length)];

        Product p = new Product();
        p.setCategory(category);

        switch (category) {
            case "ao" -> {
                p.setName(pick("Áo thun", "Áo sơ mi", "Áo polo", "Áo hoodie", "Áo len") + " " + pick("nam", "nữ", "unisex"));
                p.setMaterial(pick("Cotton", "Polyester", "Linen", "Knit"));
                p.setSku("AO" + String.format("%03d", n));
                p.setSizes(List.of("S", "M", "L", "XL"));
                p.setColors(pickList(List.of("Trắng", "Đen", "Xanh", "Be", "Xám")));
                p.setStockBySize(randomStockBySize(p.getSizes()));
                p.setPrice(150000 + random.nextInt(350000));
            }
            case "quan" -> {
                p.setName(pick("Quần jean", "Quần tây", "Quần short", "Quần jogger") + " " + pick("nam", "nữ"));
                p.setMaterial(pick("Denim", "Kaki", "Cotton", "Polyester"));
                p.setSku("QU" + String.format("%03d", n));
                p.setSizes(List.of("26", "27", "28", "29", "30", "31", "32"));
                p.setColors(pickList(List.of("Xanh", "Đen", "Xám", "Nâu")));
                p.setStockBySize(randomStockBySize(p.getSizes()));
                p.setPrice(220000 + random.nextInt(500000));
            }
            case "vay" -> {
                p.setName(pick("Váy midi", "Váy maxi", "Váy chữ A", "Váy body") + " " + pick("công sở", "dạo phố", "tiệc"));
                p.setMaterial(pick("Lụa", "Voan", "Cotton", "Knit"));
                p.setSku("VY" + String.format("%03d", n));
                p.setSizes(List.of("S", "M", "L"));
                p.setColors(pickList(List.of("Đen", "Trắng", "Đỏ", "Xanh navy", "Hồng")));
                p.setStockBySize(randomStockBySize(p.getSizes()));
                p.setPrice(280000 + random.nextInt(700000));
            }
            default -> {
                p.setName(pick("Áo khoác bomber", "Áo khoác denim", "Áo khoác gió", "Áo khoác dạ") + " " + pick("nam", "nữ", "unisex"));
                p.setMaterial(pick("Denim", "Nylon", "Wool", "Polyester"));
                p.setSku("AK" + String.format("%03d", n));
                p.setSizes(List.of("S", "M", "L", "XL"));
                p.setColors(pickList(List.of("Đen", "Xám", "Be", "Xanh rêu")));
                p.setStockBySize(randomStockBySize(p.getSizes()));
                p.setPrice(350000 + random.nextInt(1200000));
            }
        }

        p.setBrand(pick("IS207", "LocalBrand", "Basic", "Urban", "Classic"));
        p.setImage(ProductImageUrls.forProduct(p.getCategory(), p.getSku()));
        return p;
    }

    private Map<String, Integer> randomStockBySize(List<String> sizes) {
        return sizes.stream().collect(java.util.stream.Collectors.toMap(
                s -> s,
                s -> random.nextInt(31) // 0..30
        ));
    }

    private List<String> pickList(List<String> pool) {
        int count = 2 + random.nextInt(2); // 2..3
        java.util.List<String> mutable = new java.util.ArrayList<>(pool);
        java.util.Collections.shuffle(mutable, random);
        return new java.util.ArrayList<>(mutable.subList(0, Math.min(count, mutable.size())));
    }

    @SafeVarargs
    private final <T> T pick(T... items) {
        return items[random.nextInt(items.length)];
    }
}

