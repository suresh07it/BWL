package com.bwl.library;

public class LibraryDtos {
  public record SpaceDto(String id, String name, String lastModifiedBy, String lastModifiedAt, int items) {}
  public record ProcessDto(String id, String name, String fileName, String lastModifiedBy, String lastModifiedAt) {}
  public record CreateProcessRequest(String name, String fileName) {}
}

