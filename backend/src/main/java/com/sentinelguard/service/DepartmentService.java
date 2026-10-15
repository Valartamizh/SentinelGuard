package com.sentinelguard.service;

import com.sentinelguard.dto.DepartmentRequest;
import com.sentinelguard.dto.DepartmentResponse;
import com.sentinelguard.entity.Department;
import com.sentinelguard.exception.ConflictException;
import com.sentinelguard.exception.ResourceNotFoundException;
import com.sentinelguard.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    @Transactional
    public DepartmentResponse createDepartment(DepartmentRequest request) {
        String trimmedName = request.getName().trim();
        if (departmentRepository.existsByNameIgnoreCase(trimmedName)) {
            throw new ConflictException("Department with name '" + trimmedName + "' already exists");
        }

        Department department = new Department();
        department.setName(trimmedName);
        Department saved = departmentRepository.save(department);

        log.info("Created department '{}' ({})", saved.getName(), saved.getId());
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<DepartmentResponse> getAllDepartments() {
        return departmentRepository.findAll().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Department getDepartmentEntity(UUID id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with ID: " + id));
    }

    private DepartmentResponse mapToResponse(Department d) {
        return DepartmentResponse.builder()
                .id(d.getId())
                .name(d.getName())
                .createdAt(d.getCreatedAt())
                .build();
    }
}
