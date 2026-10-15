package com.sentinelguard.service;

import com.sentinelguard.dto.EmployeeRequest;
import com.sentinelguard.dto.EmployeeResponse;
import com.sentinelguard.entity.Department;
import com.sentinelguard.entity.Employee;
import com.sentinelguard.entity.EmployeeStatus;
import com.sentinelguard.exception.ConflictException;
import com.sentinelguard.exception.ResourceNotFoundException;
import com.sentinelguard.repository.DeviceRepository;
import com.sentinelguard.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final DepartmentService departmentService;
    private final DeviceRepository deviceRepository;

    @Transactional
    public EmployeeResponse createEmployee(EmployeeRequest request) {
        String code = request.getEmployeeCode().trim().toUpperCase();
        if (employeeRepository.existsByEmployeeCode(code)) {
            throw new ConflictException("Employee with code '" + code + "' already exists");
        }

        Department department = departmentService.getDepartmentEntity(request.getDepartmentId());

        Employee employee = new Employee();
        employee.setEmployeeCode(code);
        employee.setFullName(request.getFullName().trim());
        employee.setDepartment(department);
        employee.setStatus(request.getStatus() != null ? request.getStatus() : EmployeeStatus.ACTIVE);

        Employee saved = employeeRepository.save(employee);
        log.info("Created employee '{}' with code '{}' in department '{}'",
                saved.getFullName(), saved.getEmployeeCode(), department.getName());

        return mapToResponse(saved, 0);
    }

    @Transactional(readOnly = true)
    public List<EmployeeResponse> getAllEmployees() {
        return employeeRepository.findAllWithDepartment().stream()
                .map(e -> {
                    int deviceCount = deviceRepository.findByEmployeeId(e.getId()).size();
                    return mapToResponse(e, deviceCount);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public EmployeeResponse getEmployeeById(UUID id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with ID: " + id));
        int deviceCount = deviceRepository.findByEmployeeId(employee.getId()).size();
        return mapToResponse(employee, deviceCount);
    }

    @Transactional(readOnly = true)
    public Employee getEmployeeEntity(UUID id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with ID: " + id));
    }

    private EmployeeResponse mapToResponse(Employee e, int deviceCount) {
        return EmployeeResponse.builder()
                .id(e.getId())
                .employeeCode(e.getEmployeeCode())
                .fullName(e.getFullName())
                .departmentId(e.getDepartment().getId())
                .departmentName(e.getDepartment().getName())
                .status(e.getStatus())
                .deviceCount(deviceCount)
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }
}
