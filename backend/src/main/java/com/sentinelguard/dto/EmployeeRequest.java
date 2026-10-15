package com.sentinelguard.dto;

import com.sentinelguard.entity.EmployeeStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeRequest {

    @NotBlank(message = "Employee code is required")
    @Size(min = 2, max = 50, message = "Employee code must be between 2 and 50 characters")
    private String employeeCode;

    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 200, message = "Full name must be between 2 and 200 characters")
    private String fullName;

    @NotNull(message = "Department ID is required")
    private UUID departmentId;

    private EmployeeStatus status = EmployeeStatus.ACTIVE;
}
