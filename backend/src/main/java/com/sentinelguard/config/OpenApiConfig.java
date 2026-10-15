package com.sentinelguard.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Springdoc OpenAPI configuration.
 *
 * <p>Swagger UI is available at: http://localhost:8080/swagger-ui.html
 * <p>OpenAPI JSON spec:           http://localhost:8080/v3/api-docs
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI sentinelGuardOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("SentinelGuard API")
                        .description("AI-Powered Endpoint Security & Insider Threat Detection System — REST API")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("SentinelGuard Team")
                                .email("admin@sentinelguard.local"))
                        .license(new License()
                                .name("Academic — Final Year Project")
                                .url("https://github.com/sentinelguard")))
                .components(new Components()
                        .addSecuritySchemes("BearerAuth", new SecurityScheme()
                                .name("BearerAuth")
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Enter JWT Bearer token obtained from /api/v1/auth/login")))
                .addSecurityItem(new SecurityRequirement().addList("BearerAuth"));
    }
}
