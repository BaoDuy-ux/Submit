package com.shop.sales_managment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class SalesManagmentApplication {

    public static void main(String[] args) {
        SpringApplication.run(SalesManagmentApplication.class, args);
    }

}
