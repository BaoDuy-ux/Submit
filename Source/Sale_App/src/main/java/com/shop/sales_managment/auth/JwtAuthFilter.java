package com.shop.sales_managment.auth;

import com.shop.sales_managment.user.User;
import com.shop.sales_managment.user.UserRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String auth = request.getHeader("Authorization");
        if (auth != null && auth.startsWith("Bearer ")) {
            String token = auth.substring("Bearer ".length()).trim();
            try {
                Claims claims = jwtService.parse(token);
                Long userId = jwtService.getUserId(claims);
                if (userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    User u = userRepository.findById(userId).orElse(null);
                    if (u != null) {
                        UserPrincipal principal = new UserPrincipal(u.getId(), u.getUsername(), u.getRole());
                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    }
                }
            } catch (Exception ignored) {
                // invalid token -> ignore, will be handled by auth rules
            }
        }

        filterChain.doFilter(request, response);
    }
}

