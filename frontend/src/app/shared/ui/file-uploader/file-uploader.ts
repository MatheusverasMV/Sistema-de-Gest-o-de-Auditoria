import { DecimalPipe } from '@angular/common';
import { Component, input, model, signal } from '@angular/core';
import { Button, IconButton } from '../button/button';
import { Icon } from '../icon/icon';

export interface SelectedFile {
  readonly name: string;
  readonly size: number;
}

/** Seleção visual de arquivo (clique ou arrastar). O conteúdo não é lido no protótipo. */
@Component({
  selector: 'sga-file-uploader',
  imports: [Icon, Button, IconButton, DecimalPipe],
  template: `
    @if (file(); as selected) {
      <div class="selected">
        <span class="file-icon"><sga-icon name="file-spreadsheet" [size]="22" /></span>
        <div class="file-text">
          <span class="file-name">{{ selected.name }}</span>
          <span class="meta"
            >{{ selected.size / 1024 / 1024 | number: '1.1-1' }} MB · pronto para
            processamento</span
          >
        </div>
        <button
          sgaIconButton
          type="button"
          icon="x"
          label="Remover arquivo"
          (click)="file.set(null)"
        ></button>
      </div>
    } @else {
      <label
        class="dropzone"
        [class.dragging]="dragging()"
        (dragover)="onDragOver($event)"
        (dragleave)="dragging.set(false)"
        (drop)="onDrop($event)"
      >
        <input type="file" class="sr-only" [accept]="accept()" (change)="onChange($event)" />
        <span class="upload-icon"><sga-icon name="upload" [size]="22" /></span>
        <span class="primary"
          >Arraste o arquivo aqui ou <span class="link">selecione no computador</span></span
        >
        <span class="meta">{{ hint() }}</span>
      </label>
      <div class="sample">
        <span class="meta">Sem arquivo à mão?</span>
        <button
          sgaButton
          variant="ghost"
          size="sm"
          type="button"
          icon="file-spreadsheet"
          (click)="file.set(demoFile())"
        >
          Usar arquivo de demonstração
        </button>
      </div>
    }
  `,
  styleUrl: './file-uploader.scss',
})
export class FileUploader {
  readonly file = model<SelectedFile | null>(null);
  readonly accept = input('.xls,.xlsx,.csv');
  readonly hint = input('XLS, XLSX ou CSV · até 50 MB');
  readonly demoFile = input<SelectedFile>({ name: 'arquivo-demonstracao.xlsx', size: 1_000_000 });

  protected readonly dragging = signal(false);

  protected onChange(event: Event): void {
    const selected = (event.target as HTMLInputElement).files?.[0];
    if (selected) {
      this.file.set({ name: selected.name, size: selected.size });
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const dropped = event.dataTransfer?.files[0];
    if (dropped) {
      this.file.set({ name: dropped.name, size: dropped.size });
    }
  }
}
