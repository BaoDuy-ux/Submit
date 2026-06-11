package com.shop.sales_managment.auth;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.shop.sales_managment.auth.dto.CheckAvailabilityResponse;
import com.shop.sales_managment.auth.dto.LoginRequest;
import com.shop.sales_managment.auth.dto.LoginResponse;
import com.shop.sales_managment.auth.dto.RegisterRequest;
import com.shop.sales_managment.auth.dto.ForgotPasswordRequest;
import com.shop.sales_managment.auth.dto.ForgotPasswordResponse;
import com.shop.sales_managment.auth.dto.ResetPasswordRequest;
import com.shop.sales_managment.auth.dto.ResetPasswordResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest req) {
        return authService.login(req);
    }

    @GetMapping("/check-availability")
    public CheckAvailabilityResponse checkAvailability(
            @RequestParam String field,
            @RequestParam String value
    ) {
        return authService.checkAvailability(field, value);
    }

    @PostMapping("/register")
    public LoginResponse register(@Valid @RequestBody RegisterRequest req) {
        return authService.registerCustomer(req);
    }

    @PostMapping("/forgot-password")
    public ForgotPasswordResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        return authService.forgotPassword(req);
    }

    @PostMapping("/reset-password")
    public ResetPasswordResponse resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        return authService.resetPassword(req);
    }

    @PostMapping("/logout")
    public Map<String, Object> logout() {
        // Frontend tự xóa token, endpoint này chỉ để "đủ contract"
        return Map.of("ok", true);
    }
}

