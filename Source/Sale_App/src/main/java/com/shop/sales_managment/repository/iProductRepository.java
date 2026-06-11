package com.shop.sales_managment.repository;
import com.shop.sales_managment.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface iProductRepository extends JpaRepository<Product,Long>{
    Optional<Product> findBySku(String sku);
}
