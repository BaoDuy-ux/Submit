package com.shop.sales_managment.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class MailStartupLogger implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(MailStartupLogger.class);

    private final String mailUsername;
    private final String mailPassword;
    private final boolean mailEnabled;

    public MailStartupLogger(
            @Value("${spring.mail.username:}") String mailUsername,
            @Value("${spring.mail.password:}") String mailPassword,
            @Value("${app.mail.enabled:false}") boolean mailEnabled
    ) {
        this.mailUsername = mailUsername == null ? "" : mailUsername.trim();
        this.mailPassword = mailPassword == null ? "" : mailPassword.trim();
        this.mailEnabled = mailEnabled;
    }

    @Override
    public void run(ApplicationArguments args) {
        boolean hasCreds = !mailUsername.isBlank() && !mailPassword.isBlank();
        if (hasCreds && mailEnabled) {
            log.info("Gmail SMTP: da cau hinh gui mail tu {}", mailUsername);
        } else if (hasCreds) {
            log.warn("Gmail: co username/password nhung app.mail.enabled=false — dat MAIL_ENABLED=true trong application-local.properties");
        } else {
            log.warn(
                    "Gmail CHUA cau hinh. Quen mat khau se hien ma tren man hinh. "
                            + "Tao file Sale_App/src/main/resources/application-local.properties "
                            + "(xem application-local.properties.example) voi MAIL_USERNAME + MAIL_PASSWORD (App Password)."
            );
        }
    }
}
