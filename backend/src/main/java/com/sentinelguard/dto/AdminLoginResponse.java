package com.sentinelguard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminLoginResponse {
    private String token;
    @Builder.Default
    private String tokenType = "Bearer";
    private String username;
    private long expiresInMs;
}
