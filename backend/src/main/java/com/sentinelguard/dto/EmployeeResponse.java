package com.sentinelguard.dto;

import com.sentinelguard.entity.EmployeeStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeResponse {
    private UUID id;
    private String employeeCode;
    private String fullName;
    private UUID departmentId;
    private String departmentName;
    private EmployeeStatus status;
    private int deviceCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
