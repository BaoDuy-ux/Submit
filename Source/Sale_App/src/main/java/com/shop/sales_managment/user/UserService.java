package com.shop.sales_managment.user;

import com.shop.sales_managment.auth.LoginIdentifierNormalizer;
import com.shop.sales_managment.auth.UserPrincipal;
import com.shop.sales_managment.user.dto.UpdateMeRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User requireCurrent(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal p)) {
            throw new IllegalStateException("Unauthorized");
        }
        return userRepository.findById(p.getUserId()).orElseThrow(() -> new IllegalStateException("Unauthorized"));
    }

    public User updateMe(User u, UpdateMeRequest patch) {
        if (patch.getFullName() != null) u.setFullName(patch.getFullName());
        if (patch.getPhone() != null) {
            String phone = LoginIdentifierNormalizer.normalize(patch.getPhone());
            u.setPhone(phone.isBlank() ? patch.getPhone().trim() : phone);
        }
        if (patch.getEmail() != null) {
            String email = patch.getEmail().trim();
            u.setEmail(email.isBlank() ? null : email.toLowerCase());
        }
        if (patch.getAddress() != null) u.setAddress(patch.getAddress());
        return userRepository.save(u);
    }
}

