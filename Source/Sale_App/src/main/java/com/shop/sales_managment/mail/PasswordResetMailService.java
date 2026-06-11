package com.shop.sales_managment.mail;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class PasswordResetMailService {
    private static final Logger log = LoggerFactory.getLogger(PasswordResetMailService.class);

    private final JavaMailSender mailSender;
    private final MailProperties mailProperties;
    private final String smtpUsername;
    private final String smtpPassword;

    public PasswordResetMailService(
            JavaMailSender mailSender,
            MailProperties mailProperties,
            @Value("${spring.mail.username:}") String smtpUsername,
            @Value("${spring.mail.password:}") String smtpPassword
    ) {
        this.mailSender = mailSender;
        this.mailProperties = mailProperties;
        this.smtpUsername = smtpUsername == null ? "" : smtpUsername.trim();
        this.smtpPassword = smtpPassword == null ? "" : smtpPassword.trim();
    }

    public boolean isReady() {
        boolean hasSmtpCreds = !smtpUsername.isBlank() && !smtpPassword.isBlank();
        if (!hasSmtpCreds) {
            return false;
        }
        if (!mailProperties.isEnabled()) {
            return true;
        }
        String from = resolveFrom();
        return !from.isBlank() && from.contains("@");
    }

    private String resolveFrom() {
        String from = mailProperties.getFrom();
        if (from != null && !from.isBlank()) return from.trim();
        return smtpUsername;
    }

    public void sendResetCode(String toEmail, String displayName, String code, long expiresMinutes)
            throws MessagingException, java.io.UnsupportedEncodingException {
        if (!isReady()) {
            throw new IllegalStateException("Email chưa được cấu hình trên server");
        }

        String name = (displayName == null || displayName.isBlank()) ? "bạn" : displayName.trim();
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(resolveFrom(), mailProperties.getFromName());
        helper.setTo(toEmail);
        helper.setSubject("IS207 Fashion — Mã đặt lại mật khẩu");
        helper.setText(buildHtml(name, code, expiresMinutes), true);
        mailSender.send(message);
        log.info("Password reset email sent to {}", maskEmail(toEmail));
    }

    public static String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        String[] parts = email.split("@", 2);
        String local = parts[0];
        String domain = parts[1];
        if (local.length() <= 2) {
            return local.charAt(0) + "***@" + domain;
        }
        return local.substring(0, 2) + "***@" + domain;
    }

    private static String buildHtml(String name, String code, long expiresMinutes) {
        return """
                <!DOCTYPE html>
                <html lang="vi">
                <body style="font-family:Segoe UI,Arial,sans-serif;background:#f5f0eb;padding:24px">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0d5c8">
                    <tr>
                      <td style="background:#5c4033;color:#fff;padding:20px 24px">
                        <h2 style="margin:0;font-size:20px">IS207 Fashion</h2>
                        <p style="margin:8px 0 0;opacity:.9;font-size:14px">Đặt lại mật khẩu</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:24px;color:#3d2e24;font-size:15px;line-height:1.6">
                        <p>Xin chào <strong>%s</strong>,</p>
                        <p>Bạn vừa yêu cầu đặt lại mật khẩu. Mã xác nhận của bạn:</p>
                        <p style="text-align:center;margin:24px 0">
                          <span style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:8px;background:#f5f0eb;padding:16px 24px;border-radius:10px;color:#5c4033">%s</span>
                        </p>
                        <p>Mã có hiệu lực <strong>%d phút</strong>. Không chia sẻ mã với ai.</p>
                        <p style="color:#8a7566;font-size:13px">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(escapeHtml(name), escapeHtml(code), expiresMinutes);
    }

    private static String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
