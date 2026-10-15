package com.sentinelguard.controller;

import com.sentinelguard.dto.EmployeeRequest;
import com.sentinelguard.dto.EmployeeResponse;
import com.sentinelguard.service.EmployeeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/employees")
@RequiredArgsConstructor
@Tag(name = "Admin - Employees", description = "Employee record management endpoints")
@SecurityRequirement(name = "BearerAuth")
public class AdminEmployeeController {

    private final EmployeeService employeeService;

    @PostMapping
    @Operation(summary = "Create employee", description = "Registers a new employee under a department")
    public ResponseEntity<EmployeeResponse> createEmployee(@Valid @RequestBody EmployeeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(employeeService.createEmployee(request));
    }

    @GetMapping
    @Operation(summary = "List employees", description = "Retrieves all employees with department details and enrolled device counts")
    public ResponseEntity<List<EmployeeResponse>> getAllEmployees() {
        return ResponseEntity.ok(employeeService.getAllEmployees());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get employee by ID", description = "Retrieves employee details by UUID")
    public ResponseEntity<EmployeeResponse> getEmployeeById(@PathVariable UUID id) {
        return ResponseEntity.ok(employeeService.getEmployeeById(id));
    }
}
