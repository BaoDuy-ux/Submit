package com.shop.sales_managment.entity;

import com.shop.sales_managment.common.json.StringIntegerMapJsonConverter;
import com.shop.sales_managment.common.json.StringListJsonConverter;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.List;
import java.util.Map;

@Entity
@Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    @NotBlank(message = "Tên sản phẩm không được để trống")
    private String name;

    @Column(nullable = false)
    @NotBlank(message = "Danh mục không được để trống")
    private String category; // ao|quan|vay|ao-khoac

    @Column(nullable = false, unique = true)
    @NotBlank(message = "SKU không được để trống")
    private String sku;

    @Column(nullable = false)
    @Min(value = 0, message = "Giá phải >= 0")
    private long price;

    private String brand;
    private String material;

    @Column(name = "image")
    private String image;

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "colors_json", columnDefinition = "json")
    private List<String> colors;

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "sizes_json", columnDefinition = "json")
    private List<String> sizes;

    @Convert(converter = StringIntegerMapJsonConverter.class)
    @Column(name = "stock_by_size_json", columnDefinition = "json")
    private Map<String, Integer> stockBySize;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public long getPrice() {
        return price;
    }

    public void setPrice(long price) {
        this.price = price;
    }

    public String getBrand() {
        return brand;
    }

    public void setBrand(String brand) {
        this.brand = brand;
    }

    public String getMaterial() {
        return material;
    }

    public void setMaterial(String material) {
        this.material = material;
    }

    public String getImage() {
        return image;
    }

    public void setImage(String image) {
        this.image = image;
    }

    public List<String> getColors() {
        return colors;
    }

    public void setColors(List<String> colors) {
        this.colors = colors;
    }

    public List<String> getSizes() {
        return sizes;
    }

    public void setSizes(List<String> sizes) {
        this.sizes = sizes;
    }

    public Map<String, Integer> getStockBySize() {
        return stockBySize;
    }

    public void setStockBySize(Map<String, Integer> stockBySize) {
        this.stockBySize = stockBySize;
    }
}
