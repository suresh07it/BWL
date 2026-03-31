package com.bwl.metadata;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;

@Component
@ConditionalOnProperty(name = "storage.provider", havingValue = "filesystem", matchIfMissing = true)
public class FileSystemDiagramMetadataService implements DiagramMetadataService {

  @Value("${storage.base-dir:${user.dir}/data-store}")
  private String baseDir;

  private Path metadataPath(String spaceName, String fileName) {
    return Paths.get(baseDir, spaceName, fileName + ".meta.json");
  }

  @Override
  public String getMetadataJson(String spaceName, String fileName) {
    Path file = metadataPath(spaceName, fileName);
    if (!Files.exists(file)) {
      return "{\"tasks\":{}}";
    }
    try {
      return Files.readString(file, StandardCharsets.UTF_8);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  @Override
  public void saveMetadataJson(String spaceName, String fileName, String metadataJson) {
    Path file = metadataPath(spaceName, fileName);
    try {
      Files.createDirectories(file.getParent());
      Files.writeString(file, metadataJson, StandardCharsets.UTF_8, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }
}

