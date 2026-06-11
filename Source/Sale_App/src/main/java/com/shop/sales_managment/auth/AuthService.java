package com.shop.sales_managment.auth;



import com.shop.sales_managment.auth.dto.CheckAvailabilityResponse;
import com.shop.sales_managment.auth.dto.ForgotPasswordRequest;

import com.shop.sales_managment.auth.dto.ForgotPasswordResponse;

import com.shop.sales_managment.auth.dto.LoginRequest;

import com.shop.sales_managment.auth.dto.LoginResponse;

import com.shop.sales_managment.auth.dto.RegisterRequest;

import com.shop.sales_managment.auth.dto.ResetPasswordRequest;

import com.shop.sales_managment.auth.dto.ResetPasswordResponse;

import com.shop.sales_managment.mail.PasswordResetMailService;

import com.shop.sales_managment.user.Role;

import com.shop.sales_managment.user.User;

import com.shop.sales_managment.user.UserMapper;

import com.shop.sales_managment.user.UserRepository;

import jakarta.mail.MessagingException;

import org.slf4j.Logger;

import org.slf4j.LoggerFactory;

import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.stereotype.Service;



import java.security.SecureRandom;

import java.time.Instant;

import java.time.temporal.ChronoUnit;

import java.util.Optional;



@Service

public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);



    private final UserRepository userRepository;

    private final PasswordEncoder passwordEncoder;

    private final JwtService jwtService;

    private final PasswordResetTokenRepository passwordResetTokenRepository;

    private final ResetProperties resetProperties;

    private final PasswordResetMailService passwordResetMailService;

    private final SecureRandom secureRandom = new SecureRandom();



    public AuthService(

            UserRepository userRepository,

            PasswordEncoder passwordEncoder,

            JwtService jwtService,

            PasswordResetTokenRepository passwordResetTokenRepository,

            ResetProperties resetProperties,

            PasswordResetMailService passwordResetMailService

    ) {

        this.userRepository = userRepository;

        this.passwordEncoder = passwordEncoder;

        this.jwtService = jwtService;

        this.passwordResetTokenRepository = passwordResetTokenRepository;

        this.resetProperties = resetProperties;

        this.passwordResetMailService = passwordResetMailService;

    }



    public LoginResponse login(LoginRequest req) {

        Role role = Role.fromApi(req.getRole());

        if (role == null) throw new IllegalArgumentException("Role không hợp lệ");



        User u = findUserByIdentifier(req.getUsername(), role)

                .orElseThrow(() -> new IllegalArgumentException("Sai tài khoản hoặc mật khẩu"));



        if (!passwordEncoder.matches(req.getPassword(), u.getPasswordHash())) {

            throw new IllegalArgumentException("Sai tài khoản hoặc mật khẩu");

        }



        String token = jwtService.generate(u);

        return new LoginResponse(token, UserMapper.toDto(u));

    }

    public CheckAvailabilityResponse checkAvailability(String field, String value) {
        String f = field == null ? "" : field.trim().toLowerCase();
        String raw = value == null ? "" : value.trim();

        if (raw.isBlank()) {
            return new CheckAvailabilityResponse(f, false, "Vui lòng nhập thông tin");
        }

        return switch (f) {
            case "phone" -> checkPhone(raw);
            case "email" -> checkEmail(raw);
            case "username" -> checkUsername(raw);
            default -> throw new IllegalArgumentException("field phải là phone, email hoặc username");
        };
    }

    private CheckAvailabilityResponse checkPhone(String raw) {
        String phone = LoginIdentifierNormalizer.normalize(raw);
        if (phone.isBlank() || phone.length() < 9) {
            return new CheckAvailabilityResponse("phone", false, "Số điện thoại không hợp lệ");
        }
        if (userRepository.existsByPhone(phone)) {
            return new CheckAvailabilityResponse("phone", false, "Số điện thoại đã được đăng ký");
        }
        return new CheckAvailabilityResponse("phone", true, "Số điện thoại có thể sử dụng");
    }

    private CheckAvailabilityResponse checkEmail(String raw) {
        String email = raw.toLowerCase();
        if (!email.contains("@") || email.length() < 5) {
            return new CheckAvailabilityResponse("email", false, "Email không hợp lệ");
        }
        if (userRepository.existsByEmailIgnoreCase(email)) {
            return new CheckAvailabilityResponse("email", false, "Email đã được đăng ký");
        }
        return new CheckAvailabilityResponse("email", true, "Email có thể sử dụng");
    }

    private CheckAvailabilityResponse checkUsername(String raw) {
        String username = raw.trim();
        if (username.length() < 3) {
            return new CheckAvailabilityResponse("username", false, "Tên đăng nhập tối thiểu 3 ký tự");
        }
        if (userRepository.existsByUsername(username)) {
            return new CheckAvailabilityResponse("username", false, "Tên đăng nhập đã tồn tại");
        }
        return new CheckAvailabilityResponse("username", true, "Tên đăng nhập có thể sử dụng");
    }

    public LoginResponse registerCustomer(RegisterRequest req) {

        String username = req.getUsername() == null ? "" : req.getUsername().trim();

        String phone = LoginIdentifierNormalizer.normalize(req.getPhone());

        if (phone.isBlank() && req.getPhone() != null) {

            phone = req.getPhone().trim();

        }

        String email = req.getEmail() == null ? "" : req.getEmail().trim().toLowerCase();



        if (userRepository.existsByUsername(username)) {

            throw new IllegalArgumentException("Tên đăng nhập đã tồn tại");

        }

        if (!phone.isBlank() && userRepository.existsByPhone(phone)) {

            throw new IllegalArgumentException("Số điện thoại đã tồn tại");

        }

        if (!email.isBlank() && userRepository.existsByEmail(email)) {

            throw new IllegalArgumentException("Email đã tồn tại");

        }



        User u = new User();

        u.setRole(Role.CUSTOMER);

        u.setUsername(username);

        u.setPasswordHash(passwordEncoder.encode(req.getPassword()));

        u.setFullName(req.getFullName() == null ? null : req.getFullName().trim());

        u.setPhone(phone.isBlank() ? null : phone);

        u.setEmail(email.isBlank() ? null : email);

        u.setAddress(req.getAddress() == null ? null : req.getAddress().trim());



        User saved = userRepository.save(u);

        String token = jwtService.generate(saved);

        return new LoginResponse(token, UserMapper.toDto(saved));

    }



    public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest req) {

        Role role = Role.fromApi(req.getRole());

        if (role == null) {

            role = Role.CUSTOMER;

        }



        Optional<User> userOpt = findUserByIdentifier(req.getIdentifier(), role);

        String genericMessage = "Nếu tài khoản tồn tại, mã đặt lại đã được gửi tới email đăng ký.";



        if (userOpt.isEmpty()) {

            return new ForgotPasswordResponse(true, genericMessage, null);

        }



        User u = userOpt.get();

        String email = normalizeEmail(u.getEmail());

        if (email == null) {

            return new ForgotPasswordResponse(

                    true,

                    "Tài khoản chưa có email. Đăng nhập → cập nhật email trong hồ sơ → thử lại quên mật khẩu.",

                    null

            );

        }



        String code = generateResetCode();

        PasswordResetToken prt = new PasswordResetToken();

        prt.setUserId(u.getId());

        prt.setUsed(false);

        prt.setCreatedAt(Instant.now());

        prt.setExpiresAt(Instant.now().plus(resetProperties.getExpiresMinutes(), ChronoUnit.MINUTES));

        prt.setToken(code);

        passwordResetTokenRepository.save(prt);



        String exposed = null;

        String message = genericMessage;



        if (passwordResetMailService.isReady()) {

            try {

                passwordResetMailService.sendResetCode(

                        email,

                        u.getFullName(),

                        code,

                        resetProperties.getExpiresMinutes()

                );

                message = "Mã đặt lại đã gửi tới " + PasswordResetMailService.maskEmail(email)

                        + ". Kiểm tra hộp thư và thư mục Spam.";

            } catch (Exception e) {

                log.error("Send reset email failed for {}", PasswordResetMailService.maskEmail(email), e);

                exposed = code;

                message = "Không gửi được email (kiểm tra Gmail App Password). Dùng mã trên màn hình: "

                        + code;

            }

        } else {

            exposed = code;

            message = "Chưa cấu hình Gmail trên server. Mã đặt lại (hiện trên màn hình): "

                    + code + " — hết hạn sau " + resetProperties.getExpiresMinutes() + " phút.";

        }



        if (resetProperties.isExposeToken() && exposed == null) {

            exposed = code;

        }



        return new ForgotPasswordResponse(true, message, exposed);

    }



    public ResetPasswordResponse resetPassword(ResetPasswordRequest req) {

        String token = req.getToken() == null ? "" : req.getToken().trim();

        PasswordResetToken prt = passwordResetTokenRepository.findByToken(token)

                .orElseThrow(() -> new IllegalArgumentException("Token không hợp lệ hoặc đã hết hạn"));



        if (prt.isUsed() || prt.getExpiresAt() == null || prt.getExpiresAt().isBefore(Instant.now())) {

            throw new IllegalArgumentException("Token không hợp lệ hoặc đã hết hạn");

        }



        User u = userRepository.findById(prt.getUserId())

                .orElseThrow(() -> new IllegalArgumentException("Token không hợp lệ hoặc đã hết hạn"));



        u.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));

        userRepository.save(u);



        prt.setUsed(true);

        passwordResetTokenRepository.save(prt);



        return new ResetPasswordResponse(true, "Đặt lại mật khẩu thành công");

    }



    private Optional<User> findUserByIdentifier(String rawInput, Role role) {

        if (rawInput == null || rawInput.isBlank() || role == null) {

            return Optional.empty();

        }

        String raw = rawInput.trim();

        String normalized = LoginIdentifierNormalizer.normalize(raw);



        Optional<User> userOpt = resolveUserForLogin(normalized, role);

        if (userOpt.isEmpty() && !raw.equals(normalized)) {

            userOpt = resolveUserForLogin(raw, role);

        }

        return userOpt;

    }



    private Optional<User> resolveUserForLogin(String identifier, Role role) {

        if (identifier == null || identifier.isBlank()) {

            return Optional.empty();

        }

        Optional<User> userOpt = userRepository.findByUsernameAndRole(identifier, role);

        if (userOpt.isPresent()) {

            return userOpt;

        }

        userOpt = userRepository.findByPhoneAndRole(identifier, role);

        if (userOpt.isPresent()) {

            return userOpt;

        }

        if (identifier.contains("@")) {

            return userRepository.findByEmailIgnoreCaseAndRole(identifier, role);

        }

        return Optional.empty();

    }



    private String generateResetCode() {

        for (int i = 0; i < 8; i++) {

            int code = 100000 + secureRandom.nextInt(900000);

            String s = String.valueOf(code);

            if (passwordResetTokenRepository.findByToken(s).isEmpty()) {

                return s;

            }

        }

        throw new IllegalStateException("Không tạo được mã đặt lại, vui lòng thử lại");

    }



    private static String normalizeEmail(String email) {

        if (email == null) return null;

        String e = email.trim().toLowerCase();

        if (e.isBlank() || !e.contains("@")) return null;

        return e;

    }

}


