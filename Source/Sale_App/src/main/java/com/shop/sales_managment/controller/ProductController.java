package com.shop.sales_managment.controller;

import com.shop.sales_managment.entity.Product;
import com.shop.sales_managment.repository.iProductRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/products")
public class ProductController {
    private final iProductRepository productRepository;

    public ProductController(iProductRepository productRepository) {
        this.productRepository = productRepository;
    }
    @GetMapping
    List<Product> getAllProducts(){
        return productRepository.findAll();
    }
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    Product addProduct(@Valid @RequestBody Product product){
        if (product.getSku() != null && productRepository.findBySku(product.getSku()).isPresent()) {
            throw new IllegalArgumentException("SKU đã tồn tại");
        }
        return productRepository.save(product);
    }

    @PutMapping("/{id}")
    Product updateProduct(@PathVariable Long id, @Valid @RequestBody Product patch) {
        Product existing = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm"));

        if (patch.getSku() != null && !patch.getSku().equals(existing.getSku())) {
            if (productRepository.findBySku(patch.getSku()).isPresent()) {
                throw new IllegalArgumentException("SKU đã tồn tại");
            }
        }
        existing.setName(patch.getName());
        existing.setCategory(patch.getCategory());
        existing.setSku(patch.getSku());
        existing.setPrice(patch.getPrice());
        existing.setBrand(patch.getBrand());
        existing.setMaterial(patch.getMaterial());
        existing.setColors(patch.getColors());
        existing.setSizes(patch.getSizes());
        existing.setStockBySize(patch.getStockBySize());
        existing.setImage(patch.getImage());
        return productRepository.save(existing);
    }

    @DeleteMapping("/{id}")
    void deleteProduct(@PathVariable Long id) {
        if (!productRepository.existsById(id)) {
            throw new IllegalArgumentException("Không tìm thấy sản phẩm");
        }
        productRepository.deleteById(id);
    }

    @DeleteMapping
    Map<String, Object> deleteAllProducts() {
        long before = productRepository.count();
        productRepository.deleteAll();
        return Map.of("ok", true, "deleted", before);
    }

}
