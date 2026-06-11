package com.shop.sales_managment.auth;

import com.shop.sales_managment.config.AppProperties;
import com.shop.sales_managment.user.Role;
import com.shop.sales_managment.user.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {
    private final AppProperties props;

    public JwtService(AppProperties props) {
        this.props = props;
    }

    private SecretKey key() {
        String secret = props.getSecret();
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT secret chưa được cấu hình");
        }
        if (secret.contains("CHANGE_ME")) {
            throw new IllegalStateException("JWT secret đang dùng giá trị mặc định (CHANGE_ME). Hãy đặt biến môi trường JWT_SECRET.");
        }
        // HS256 requires >= 256-bit key (32 bytes)
        if (secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT secret quá ngắn. Cần tối thiểu 32 bytes.");
        }
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generate(User user) {
        Instant now = Instant.now();
        Instant exp = now.plus(props.getExpiresMinutes(), ChronoUnit.MINUTES);

        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .claims(Map.of(
                        "role", user.getRole() != null ? user.getRole().toApi() : null,
                        "username", user.getUsername()
                ))
                .signWith(key())
                .compact();
    }

    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public Long getUserId(Claims claims) {
        try {
            return Long.valueOf(String.valueOf(claims.getSubject()));
        } catch (Exception e) {
            return null;
        }
    }

    public Role getRole(Claims claims) {
        Object r = claims.get("role");
        return Role.fromApi(r == null ? null : String.valueOf(r));
    }
}

