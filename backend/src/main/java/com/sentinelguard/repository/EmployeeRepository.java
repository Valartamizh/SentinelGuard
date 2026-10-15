package com.sentinelguard.repository;

import com.sentinelguard.entity.Employee;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, UUID> {
    Optional<Employee> findByEmployeeCode(String employeeCode);
    boolean existsByEmployeeCode(String employeeCode);
    List<Employee> findByDepartmentId(UUID departmentId);

    @Query("SELECT e FROM Employee e JOIN FETCH e.department ORDER BY e.createdAt DESC")
    List<Employee> findAllWithDepartment();

    @Query(value = "SELECT e FROM Employee e JOIN FETCH e.department",
           countQuery = "SELECT COUNT(e) FROM Employee e")
    Page<Employee> findAllWithDepartment(Pageable pageable);
}
