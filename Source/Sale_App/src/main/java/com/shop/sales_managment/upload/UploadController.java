package com.shop.sales_managment.upload;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/uploads")
public class UploadController {
    private final UploadProperties props;
    private final SecureRandom random = new SecureRandom();

    public UploadController(UploadProperties props) {
        this.props = props;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> upload(@RequestParam("file") MultipartFile file, HttpServletRequest request) throws IOException {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Vui lòng chọn file ảnh");
        if (props.getMaxBytes() > 0 && file.getSize() > props.getMaxBytes()) {
            throw new IllegalArgumentException("File quá lớn (tối đa 5MB)");
        }

        String contentType = file.getContentType();
        if (contentType == null || !(contentType.startsWith("image/"))) {
            throw new IllegalArgumentException("Chỉ hỗ trợ file ảnh");
        }

        String original = file.getOriginalFilename();
        String ext = "";
        if (original != null) {
            String cleaned = StringUtils.cleanPath(original);
            int idx = cleaned.lastIndexOf('.');
            if (idx >= 0 && idx < cleaned.length() - 1) {
                ext = cleaned.substring(idx + 1).toLowerCase();
            }
        }
        if (!(ext.equals("png") || ext.equals("jpg") || ext.equals("jpeg") || ext.equals("webp"))) {
            // allow by content-type but keep safe file extensions
            ext = "png";
        }

        String name = "p_" + Instant.now().toEpochMilli() + "_" + randomHex(8) + "." + ext;

        Path uploadDir = Paths.get(props.getDir()).toAbsolutePath().normalize();
        Files.createDirectories(uploadDir);
        Path dest = uploadDir.resolve(name).normalize();
        if (!dest.startsWith(uploadDir)) {
            throw new IllegalArgumentException("Đường dẫn file không hợp lệ");
        }
        Files.write(dest, file.getBytes());

        String base = request.getScheme() + "://" + request.getServerName() + ":" + request.getServerPort();
        String url = base + "/uploads/" + name;
        return Map.of("ok", true, "url", url, "path", "/uploads/" + name);
    }

    private String randomHex(int len) {
        byte[] b = new byte[Math.max(1, len / 2)];
        random.nextBytes(b);
        StringBuilder sb = new StringBuilder();
        for (byte x : b) sb.append(String.format("%02x", x));
        return sb.substring(0, Math.min(len, sb.length()));
    }
}

