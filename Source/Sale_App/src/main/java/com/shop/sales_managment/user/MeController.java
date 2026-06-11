package com.shop.sales_managment.user;

import com.shop.sales_managment.user.dto.UpdateMeRequest;
import com.shop.sales_managment.user.dto.UserDto;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/me")
public class MeController {
    private final UserService userService;

    public MeController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public UserDto me(Authentication auth) {
        User u = userService.requireCurrent(auth);
        return UserMapper.toDto(u);
    }

    @PutMapping
    public UserDto updateMe(Authentication auth, @Valid @RequestBody UpdateMeRequest patch) {
        User u = userService.requireCurrent(auth);
        User saved = userService.updateMe(u, patch);
        return UserMapper.toDto(saved);
    }
}

