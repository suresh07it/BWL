package com.bwl.library;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class LibrarySeeder {

  private final LibraryCatalogService catalog;

  public LibrarySeeder(LibraryCatalogService catalog) {
    this.catalog = catalog;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void seed() {
    catalog.ensureSeeded();
  }
}

