package com.sentinelguard.controller;

import com.sentinelguard.dto.DepartmentRequest;
import com.sentinelguard.dto.DepartmentResponse;
import com.sentinelguard.service.DepartmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/departments")
@RequiredArgsConstructor
@Tag(name = "Admin - Departments", description = "Department organization endpoints")
@SecurityRequirement(name = "BearerAuth")
public class AdminDepartmentController {

    private final DepartmentService departmentService;

    @PostMapping
    @Operation(summary = "Create department", description = "Creates a new organizational department")
    public ResponseEntity<DepartmentResponse> createDepartment(@Valid @RequestBody DepartmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(departmentService.createDepartment(request));
    }

    @GetMapping
    @Operation(summary = "List departments", description = "Retrieves all departments")
    public ResponseEntity<List<DepartmentResponse>> getAllDepartments() {
        return ResponseEntity.ok(departmentService.getAllDepartments());
    }
}
