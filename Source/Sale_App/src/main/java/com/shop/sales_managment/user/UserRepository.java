package com.shop.sales_managment.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsernameAndRole(String username, Role role);

    Optional<User> findByPhoneAndRole(String phone, Role role);

    Optional<User> findByEmailAndRole(String email, Role role);

    Optional<User> findByUsername(String username);

    Optional<User> findByPhone(String phone);

    Optional<User> findByEmail(String email);

    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByEmailIgnoreCaseAndRole(String email, Role role);

    boolean existsByUsername(String username);

    boolean existsByPhone(String phone);

    boolean existsByEmail(String email);

    boolean existsByEmailIgnoreCase(String email);
}

