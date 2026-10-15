package com.sentinelguard.service;

import com.sentinelguard.dto.EventResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
public class SseBroadcasterService {

    private static final Long EMITTER_TIMEOUT = 30 * 60 * 1000L; // 30 minutes
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public SseEmitter registerClient() {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT);

        emitter.onCompletion(() -> {
            log.debug("SSE emitter completed");
            emitters.remove(emitter);
        });

        emitter.onTimeout(() -> {
            log.debug("SSE emitter timed out");
            emitter.complete();
            emitters.remove(emitter);
        });

        emitter.onError(e -> {
            log.debug("SSE emitter error: {}", e.getMessage());
            emitter.complete();
            emitters.remove(emitter);
        });

        emitters.add(emitter);
        log.debug("New SSE client registered. Total active: {}", emitters.size());

        // Send initial connected event
        try {
            emitter.send(SseEmitter.event()
                    .name("INIT")
                    .data("Connected to SentinelGuard Real-Time Endpoint Telemetry Stream"));
        } catch (IOException e) {
            log.debug("Failed to send INIT event to SSE client: {}", e.getMessage());
            emitters.remove(emitter);
        }

        return emitter;
    }

    public void broadcastEvent(EventResponse event) {
        if (emitters.isEmpty()) {
            return;
        }

        log.debug("Broadcasting event {} to {} SSE clients", event.getEventUuid(), emitters.size());
        List<SseEmitter> deadEmitters = new CopyOnWriteArrayList<>();

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("ENDPOINT_EVENT")
                        .data(event));
            } catch (Exception e) {
                log.debug("SSE delivery failure, removing client: {}", e.getMessage());
                deadEmitters.add(emitter);
            }
        }

        emitters.removeAll(deadEmitters);
    }

    @Scheduled(fixedRate = 15000)
    public void sendHeartbeat() {
        if (emitters.isEmpty()) {
            return;
        }

        List<SseEmitter> deadEmitters = new CopyOnWriteArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().comment("ping"));
            } catch (Exception e) {
                deadEmitters.add(emitter);
            }
        }
        emitters.removeAll(deadEmitters);
    }

    public int getActiveClientCount() {
        return emitters.size();
    }
}
