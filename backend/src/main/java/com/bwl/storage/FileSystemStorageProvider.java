package com.bwl.storage;

import com.bwl.service.BpmnStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.List;
import java.util.stream.Collectors;

@Component
@ConditionalOnProperty(name = "storage.provider", havingValue = "filesystem", matchIfMissing = true)
public class FileSystemStorageProvider implements BpmnStorageService {

  @Value("${storage.base-dir:${user.dir}/data-store}")
  private String baseDir;

  private Path spacePath(String spaceName) {
    return Paths.get(baseDir, spaceName);
  }

  @Override
  public void saveDiagram(String spaceName, String fileName, String xmlContent) {
    Path dir = spacePath(spaceName);
    Path file = dir.resolve(fileName);
    try {
      Files.createDirectories(dir);
      Files.writeString(file, xmlContent, StandardCharsets.UTF_8, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  @Override
  public String getDiagram(String spaceName, String fileName) {
    Path file = spacePath(spaceName).resolve(fileName);
    try {
      return Files.readString(file, StandardCharsets.UTF_8);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  @Override
  public List<String> listDiagramsBySpace(String spaceName) {
    Path dir = spacePath(spaceName);
    try {
      if (!Files.exists(dir)) {
        return List.of();
      }
      try (java.util.stream.Stream<Path> stream = Files.list(dir)) {
        return stream.filter(Files::isRegularFile).map(p -> p.getFileName().toString()).collect(Collectors.toList());
      }
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }
}
