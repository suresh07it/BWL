package com.bwl;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;

@SpringBootApplication
public class BwlApplication {
  public static void main(String[] args) {
    ensureWebPortAvailable(8081);

    String artifacts = System.getProperty("de.flapdoodle.embed.mongo.artifacts");
    if (artifacts == null || artifacts.isBlank()) {
      Path path = Paths.get(System.getProperty("user.dir"), "data-store", "mongo-artifacts");
      try {
        Files.createDirectories(path);
      } catch (Exception e) {
        throw new RuntimeException("Failed to create embedded mongo artifacts dir: " + path, e);
      }
      System.setProperty("de.flapdoodle.embed.mongo.artifacts", path.toString());
    }

    killStaleEmbeddedMongod();

    try {
      Path dbDir = Paths.get(System.getProperty("user.dir"), "data-store", "mongo");
      Files.createDirectories(dbDir);
      Files.deleteIfExists(dbDir.resolve("mongod.lock"));
      Files.deleteIfExists(dbDir.resolve("WiredTiger.lock"));
    } catch (Exception ignored) {
    }

    SpringApplication.run(BwlApplication.class, args);
  }

  private static void ensureWebPortAvailable(int port) {
    try (ServerSocket s = new ServerSocket()) {
      s.setReuseAddress(true);
      s.bind(new InetSocketAddress("127.0.0.1", port));
    } catch (IOException e) {
      throw new RuntimeException("Port " + port + " is already in use. Stop the existing backend process and retry.", e);
    }
  }

  private static void killStaleEmbeddedMongod() {
    String dbDir = Paths.get(System.getProperty("user.dir"), "data-store", "mongo").toString().toLowerCase(Locale.ROOT);
    String artifactsDir = Paths.get(System.getProperty("user.dir"), "data-store", "mongo-artifacts").toString().toLowerCase(Locale.ROOT);
    ProcessHandle.allProcesses().forEach(ph -> {
      try {
        String cmd = ph.info().command().orElse("").toLowerCase(Locale.ROOT);
        if (!cmd.contains("mongod")) return;
        String cmdLine = ph.info().commandLine().orElse("").toLowerCase(Locale.ROOT);
        if (!cmdLine.contains(dbDir) && !cmd.contains(artifactsDir)) return;
        ph.destroy();
        try {
          ph.onExit().get();
        } catch (Exception ignored) {
        }
        if (ph.isAlive()) ph.destroyForcibly();
      } catch (Exception ignored) {
      }
    });
  }
}
