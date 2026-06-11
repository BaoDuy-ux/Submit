package com.shop.sales_managment.user;

import com.shop.sales_managment.user.dto.UserDto;

public final class UserMapper {
    private UserMapper() {}

    public static UserDto toDto(User u) {
        UserDto dto = new UserDto();
        dto.setId(u.getId());
        dto.setRole(u.getRole() != null ? u.getRole().toApi() : null);
        dto.setUsername(u.getUsername());
        dto.setFullName(u.getFullName());
        dto.setPhone(u.getPhone());
        dto.setEmail(u.getEmail());
        dto.setAddress(u.getAddress());
        return dto;
    }
}

