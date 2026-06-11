package com.shop.sales_managment.config;

import com.shop.sales_managment.auth.LoginIdentifierNormalizer;
import com.shop.sales_managment.user.User;
import com.shop.sales_managment.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class PhoneNormalizationRunner implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(PhoneNormalizationRunner.class);

    private final UserRepository userRepository;

    public PhoneNormalizationRunner(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        int updated = 0;
        for (User u : userRepository.findAll()) {
            String raw = u.getPhone();
            if (raw == null || raw.isBlank()) continue;
            String normalized = LoginIdentifierNormalizer.normalize(raw);
            if (!normalized.isBlank() && !normalized.equals(raw)) {
                u.setPhone(normalized);
                userRepository.save(u);
                updated++;
            }
        }
        if (updated > 0) {
            log.info("Da chuan hoa {} so dien thoai trong DB", updated);
        }
    }
}
