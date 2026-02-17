import { Component, inject, PLATFORM_ID, OnInit, signal, ViewChild, ElementRef, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';

import { AuthUser } from '../../interfaces/auth.interface';
import { USER_STORAGE_KEY } from '../../interfaces/becados';

@Component({
  selector: 'app-formulario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './formulario.component.html',
  styleUrl: './formulario.component.css'
})
export class FormularioComponent implements OnInit, AfterViewInit {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private fb = inject(FormBuilder);


  @ViewChild('firmaCanvas', { static: false }) firmaCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('firmaFileInput', { static: false }) firmaFileInput!: ElementRef<HTMLInputElement>;

  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;

  becado = signal<AuthUser | null>(null);
  rendicionForm: FormGroup;

  totalGastos = signal(0);
  selectedImage: string | null = null;

  pdfGenerado = false;
  uploadMessage = '';
  uploadSuccess = false;
  ultimoPDF: jsPDF | null = null;

  readonly GOOGLE_FORMS_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeoeQu-yPmEg2x8Q7dqdUWoOcz4R38pkDOQYUZA7vmOd1Ffiw/viewform?usp=pp_url';

  constructor() {
    this.rendicionForm = this.fb.group({
      fechaInicio: ['', Validators.required],
      fechaFin: ['', Validators.required],

      gastoFijo: this.fb.group({
        proveedor: ['',],
        concepto: ['Alquiler de cuarto',],
        monto: [null, [Validators.min(0.01)]],
      }),

      gastosMovilidad: this.fb.array([
        this.createMovilidadGroup()
      ]),

      otrosGastos: this.fb.array([
        this.createOtrosGroup()
      ]),

      lugarFirma: ['', Validators.required],
      firmaData: [''],
      firmaImagen: [''],
      firmaImagenNombre: ['']
    });

    this.rendicionForm.valueChanges.subscribe(() => {
      this._calcularTotalGastos();
    });

    this._calcularTotalGastos();
  }

  // Escuchar cambios de tamaño de ventana
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.resizeCanvas();
  }

  onFileSelected(event: any, index: number): void {
    const file = event.target.files[0];

    if (file) {
      if (!file.type.match('image.*')) {
        alert('Solo se permiten archivos de imagen (JPEG, PNG, etc.)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen es demasiado grande. Máximo 5MB permitido.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        const gastoMovilidad = this.gastosMovilidadArray.at(index);
        gastoMovilidad.patchValue({
          evidencia: e.target.result,
          nombreArchivo: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(index: number): void {
    const gastoMovilidad = this.gastosMovilidadArray.at(index);
    gastoMovilidad.patchValue({
      evidencia: null,
      nombreArchivo: null
    });
  }

  viewImage(imageData: string): void {
    this.selectedImage = imageData;
  }

  closeImageModal(): void {
    this.selectedImage = null;
  }

  getFileName(imageData: string): string {
    const gastoMovilidad = this.gastosMovilidadArray.controls.find(control =>
      control.get('evidencia')?.value === imageData
    );

    const fileName = gastoMovilidad?.get('nombreArchivo')?.value;
    if (fileName) {
      return fileName.length > 20 ? fileName.substring(0, 20) + '...' : fileName;
    }

    return 'Imagen cargada';
  }

  get gastosMovilidadArray(): FormArray {
    return this.rendicionForm.get('gastosMovilidad') as FormArray;
  }

  get otrosGastosArray(): FormArray {
    return this.rendicionForm.get('otrosGastos') as FormArray;
  }

  createMovilidadGroup(): FormGroup {
    return this.fb.group({
      fecha: ['', Validators.required],
      rutaDel: ['', Validators.required],
      rutaAl: ['', Validators.required],
      monto: [null, [Validators.required, Validators.min(0.01)]],
      evidencia: [null],
      nombreArchivo: [null]
    });
  }

  createOtrosGroup(): FormGroup {
    return this.fb.group({
      fecha: [''],
      concepto: [''],
      monto: [null],
    });
  }

  addMovilidad(): void {
    this.gastosMovilidadArray.push(this.createMovilidadGroup());
    this._calcularTotalGastos();
  }

  removeMovilidad(index: number): void {
    this.gastosMovilidadArray.removeAt(index);
    this._calcularTotalGastos();
  }

  addOtros(): void {
    this.otrosGastosArray.push(this.createOtrosGroup());
    this._calcularTotalGastos();
  }

  removeOtros(index: number): void {
    this.otrosGastosArray.removeAt(index);
    this._calcularTotalGastos();
  }

  private _calcularTotalGastos(): void {
    const formValue = this.rendicionForm.value;

    const fijoMonto = formValue.gastoFijo?.monto || 0;

    const totalMovilidad = (formValue.gastosMovilidad as any[] || [])
      .reduce((sum, control) => sum + (control.monto || 0), 0);

    const totalOtros = (formValue.otrosGastos as any[] || [])
      .reduce((sum, control) => sum + (control.monto || 0), 0);

    const grandTotal = parseFloat((fijoMonto + totalMovilidad + totalOtros).toFixed(2));

    this.totalGastos.set(grandTotal);
  }

  redirigirAGoogleForms(): void {
    if (this.ultimoPDF) {
      const confirmacion = confirm('Se abrirá el formulario oficial de Google Forms para que suba su archivo PDF. ¿Desea continuar?');

      if (confirmacion) {
        window.open(this.GOOGLE_FORMS_URL, '_blank');
      }
    } else {
      alert('Primero debe generar el PDF antes de poder subirlo al formulario.');
    }
  }

  private numberToWords(n: number): string {
    const numStr = n.toFixed(2);
    const [entero, decimal] = numStr.split('.');

    const text = 'Monto en letras simplificado';

    return `${text} y ${decimal}/100`;
  }

  ngAfterViewInit(): void {
    // Dar un pequeño timeout para asegurar que el contenedor tenga dimensiones
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        this.resizeCanvas();
        this.initFirmaCanvas();
      }, 100);
    }
  }

  private resizeCanvas(): void {
    if (this.firmaCanvas && isPlatformBrowser(this.platformId)) {
      const canvas = this.firmaCanvas.nativeElement;
      const container = canvas.parentElement;

      if (container) {
        // Guardar el contenido actual para restaurarlo
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        if (tempCtx) {
          tempCtx.drawImage(canvas, 0, 0);
        }

        // Ajustar al ancho del contenedor
        const newWidth = container.offsetWidth - 30; // -30 padding aprox
        const newHeight = 150;

        // Solo redimensionar si ha cambiado
        if (canvas.width !== newWidth || canvas.height !== newHeight) {
          canvas.width = newWidth;
          canvas.height = newHeight;

          // Reinicializar configuración del contexto (colores, linea, etc)
          this.initFirmaCanvas(false);

          const firmaData = this.rendicionForm.get('firmaData')?.value;
          if (firmaData) {
            // Si ya había firma, restaurar la imagen escalada
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);
            }
          } else {
            // Si no había firma, reiniciar para mostrar el texto "Firme aquí" centrado
            this.initFirmaCanvas(true);
          }
        }
      }
    }
  }

  private initFirmaCanvas(clear: boolean = true): void {
    if (this.firmaCanvas) {
      const canvas = this.firmaCanvas.nativeElement;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (clear) {
          ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpiar fondo
          // No dibujar rectángulo ni texto para que sea lienzo limpio
          // o dibujar una línea de base si se prefiere
        }

        // Texto guía si está vacío
        const firmaData = this.rendicionForm.get('firmaData')?.value;
        if (!firmaData && clear) {
          ctx.font = '14px Arial';
          ctx.fillStyle = '#cccccc';
          ctx.textAlign = 'center';
          ctx.fillText('Firme aquí', canvas.width / 2, canvas.height / 2);
        }
      }
    }
  }

  startDrawing(event: MouseEvent): void {
    this.isDrawing = true;
    const canvas = this.firmaCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    this.lastX = event.clientX - rect.left;
    this.lastY = event.clientY - rect.top;

    this.clearGuiaText();
  }

  startDrawingTouch(event: TouchEvent): void {
    event.preventDefault();
    this.isDrawing = true;
    const canvas = this.firmaCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];
    this.lastX = touch.clientX - rect.left;
    this.lastY = touch.clientY - rect.top;

    this.clearGuiaText();
  }

  draw(event: MouseEvent): void {
    if (!this.isDrawing) return;

    const canvas = this.firmaCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(this.lastX, this.lastY);
      ctx.lineTo(currentX, currentY);
      ctx.stroke();
    }

    this.lastX = currentX;
    this.lastY = currentY;

    this.saveFirmaData();
  }

  drawTouch(event: TouchEvent): void {
    if (!this.isDrawing) return;

    event.preventDefault();
    const canvas = this.firmaCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];
    const currentX = touch.clientX - rect.left;
    const currentY = touch.clientY - rect.top;

    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(this.lastX, this.lastY);
      ctx.lineTo(currentX, currentY);
      ctx.stroke();
    }

    this.lastX = currentX;
    this.lastY = currentY;

    this.saveFirmaData();
  }

  stopDrawing(): void {
    this.isDrawing = false;
    this.saveFirmaData();
  }

  private clearGuiaText(): void {
    const canvas = this.firmaCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Limpiar área central donde está el texto "Firme aquí"
      ctx.clearRect(canvas.width / 2 - 60, canvas.height / 2 - 15, 120, 30);
    }
  }


  private saveFirmaData(): void {
    const canvas = this.firmaCanvas.nativeElement;
    const firmaData = canvas.toDataURL('image/png');
    this.rendicionForm.patchValue({
      firmaData: firmaData
    });
  }

  onFirmaImageSelected(event: any): void {
    const file = event.target.files[0];

    if (file) {
      if (!file.type.match('image.*')) {
        alert('Solo se permiten archivos de imagen (JPEG, PNG, etc.)');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen de firma es demasiado grande. Máximo 2MB permitido.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        const canvas = this.firmaCanvas.nativeElement;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        this.rendicionForm.patchValue({
          firmaImagen: e.target.result,
          firmaImagenNombre: file.name,
          firmaData: ''
        });
      };
      reader.readAsDataURL(file);
    }
  }

  removeFirmaImage(event: Event): void {
    event.stopPropagation();
    this.rendicionForm.patchValue({
      firmaImagen: '',
      firmaImagenNombre: ''
    });
  }

  viewFirmaImage(event: Event): void {
    event.stopPropagation();
    this.selectedImage = this.rendicionForm.get('firmaImagen')?.value;
  }

  getFirmaImageName(): string {
    const fileName = this.rendicionForm.get('firmaImagenNombre')?.value;
    if (fileName) {
      return fileName.length > 25 ? fileName.substring(0, 25) + '...' : fileName;
    }
    return 'Imagen de firma cargada';
  }
  getFirmaSeleccionada(): string {
    if (this.rendicionForm.get('firmaData')?.value) {
      return 'Firma dibujada';
    } else if (this.rendicionForm.get('firmaImagen')?.value) {
      return 'Imagen de firma cargada';
    }
    return '';
  }

  limpiarTodasFirmas(): void {
    this.clearFirma(true);
    this.rendicionForm.patchValue({
      firmaImagen: '',
      firmaImagenNombre: ''
    });
  }

  // --- Modal de Firma Logic ---
  openSignatureModal(): void {
    const modal = document.getElementById('signatureModal');
    if (modal) {
      modal.classList.add('show');
      modal.style.display = 'block';
      modal.removeAttribute('aria-hidden');
      modal.setAttribute('aria-modal', 'true');

      // Inicializar canvas después de que el modal sea visible
      setTimeout(() => {
        this.initFirmaCanvas(true);
      }, 100);
    }
  }

  closeSignatureModal(): void {
    const modal = document.getElementById('signatureModal');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      modal.removeAttribute('aria-modal');
    }
  }

  saveSignature(): void {
    const canvas = this.firmaCanvas.nativeElement;
    // Verificar si está vacío (opcional, por ahora asumimos que si guarda es lo que quiere)
    // Se podría checar si isDrawing se activó alguna vez o si el canvas está en blanco.

    const signatureData = canvas.toDataURL('image/png');
    this.rendicionForm.patchValue({
      firmaData: signatureData
    });
    this.closeSignatureModal();
  }
  // ----------------------------

  clearFirma(redibujar: boolean = true): void {
    const canvas = this.firmaCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (redibujar) {
        this.initFirmaCanvas(true);
      }
    }

    // Si estamos limpiando desde el modal, NO borramos el valor del formulario todavía?
    // O si? "Limpiar" en modal solo limpia el canvas actual.
    // Si es desde afuera (eliminar), borramos el valor.
    // Vamos a diferenciar:
    // clearFirma() se usa para el canvas.
    // Si queremos borrar la firma guardada, usamos otra lógica o lo llamamos explícitamente.
    // El botón "Eliminar" de la preview llama a `clearFirma(false)` lo cual borra el canvas (invisble) y el valor.
    // El botón "Limpiar" del modal llama a `clearFirma(true)` lo cual borra el canvas y el valor?
    // Mmm, el botón Limpiar del modal debería borrar solo el canvas, no el form value (hasta que guardes).
    // Pero por simplicidad, dejémoslo que borre el value, total si cancelas no se guarda... espera.
    // Si borro value y cancelo, se perdió? 
    // Mejor: clearFirma solo borra canvas.
    // saveSignature actualiza value.
    // eliminarFirma (nueva) borra value.

    // Ajuste rápido:
    // Si redibujar es true (modal), solo limpia canvas.
    // Si redibujar es false (eliminar desde preview), limpia value.

    if (!redibujar) {
      this.rendicionForm.patchValue({
        firmaData: ''
      });
    }
  }

  submitRendicion(): void {
    const formValue = this.rendicionForm.value;
    const tieneMovilidadValida = this.gastosMovilidadArray.controls
      .some(control => control.get('monto')?.value > 0);

    // Validar monto mínimo de movilidad (independiente de required)
    if (!tieneMovilidadValida) {
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'Debe registrar al menos un Gasto de Movilidad con un monto mayor a S/ 0.00.',
        confirmButtonColor: '#ffc107'
      });
      this.rendicionForm.markAllAsTouched();
      return;
    }

    // Validar Presencia de Firma (Dibujo o Imagen)
    const tieneFirma = this.rendicionForm.get('firmaData')?.value || this.rendicionForm.get('firmaImagen')?.value;
    if (!tieneFirma) {
      Swal.fire({
        icon: 'warning',
        title: 'Falta Firma',
        text: 'Debe dibujar su firma o cargar una imagen de ella antes de continuar.',
        confirmButtonColor: '#ffc107'
      });
      this.rendicionForm.markAllAsTouched();
      return;
    }

    if (this.rendicionForm.valid) {
      if (isPlatformBrowser(this.platformId)) {
        this.ultimoPDF = this.generarPDFyGuardar();
        this.pdfGenerado = true;

        Swal.fire({
          icon: 'success',
          title: '¡Éxito!',
          text: 'PDF generado correctamente. Ahora puede subirlo al formulario.',
          confirmButtonColor: '#198754'
        });

        this.uploadMessage = '✅ PDF generado exitosamente.';
        setTimeout(() => { this.uploadMessage = ''; }, 5000);
      } else {
        alert('La generación de PDF no está disponible en el servidor (SSR).');
      }
    } else {
      // Formulario inválido
      this.rendicionForm.markAllAsTouched();

      Swal.fire({
        icon: 'error',
        title: 'Formulario Incompleto',
        html: `Por favor, complete los campos marcados en <b style="color:red">rojo</b> antes de generar el PDF.`,
        confirmButtonColor: '#dc3545'
      });
    }
  }

  isFieldInvalid(controlName: string): boolean {
    const control = this.rendicionForm.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  isArrayFieldInvalid(arrayName: string, index: number, controlName: string): boolean {
    const formArray = this.rendicionForm.get(arrayName) as FormArray;
    const group = formArray.at(index) as FormGroup;
    const control = group.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  private generarPDFyGuardar(): jsPDF {
    const formData = this.rendicionForm.value;
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 15;

    const becadoName = this.becado()?.name || 'N/A';
    const becadoDni = this.becado()?.dni || 'N/A';
    const periodo = `Del ${formData.fechaInicio} al ${formData.fechaFin}`;
    const lugarFirma = formData.lugarFirma || 'Huaral, Chancay';

    const gastoFijoMonto = formData.gastoFijo.monto || 0;
    const totalMovilidad = formData.gastosMovilidad.reduce((sum: number, g: any) => sum + (g.monto || 0), 0);
    const totalOtros = formData.otrosGastos.reduce((sum: number, g: any) => sum + (g.monto || 0), 0);
    const grandTotal = gastoFijoMonto + totalMovilidad + totalOtros;
    const total = grandTotal.toFixed(2);

    const firmaData = formData.firmaData || formData.firmaImagen;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ASOCIACION CIVIL MINA MARIA TERESA', 105, y, { align: 'center' });
    y += 6;

    doc.setFontSize(8);
    doc.text('REPORTE DE RENDICION DE CUENTAS DE LA SUBVENCION DE', 105, y, { align: 'center' });
    y += 4;
    doc.text('TRANSPORTE, ALOJAMIENTO Y ALIMENTACION', 105, y, { align: 'center' });
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('NOMBRE APELLIDO', 15, y);
    y += 3;
    doc.text('DEL BECARIO:', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(becadoName, 60, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.text('DNI:', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(becadoDni, 60, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.text('FECHA DE/ A:', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(periodo, 60, y);
    y += 8;

    const bodyResumen: any[] = [];

    if (totalMovilidad > 0) {
      bodyResumen.push([
        { content: 'Del 01 al 30', styles: { halign: 'center' } },
        '',
        'Movilidad para clases',
        { content: 'Declaración\njurada', styles: { halign: 'center', fontSize: 7 } },
        { content: totalMovilidad.toFixed(2), styles: { halign: 'right' } }
      ]);
    }

    if (totalOtros > 0) {
      bodyResumen.push([
        { content: 'Del 01 al 30', styles: { halign: 'center' } },
        '',
        'Alimentación días clases',
        '',
        { content: totalOtros.toFixed(2), styles: { halign: 'right' } }
      ]);
    }

    autoTable(doc, {
      startY: y,
      head: [[
        { content: 'FECHA', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'NOMBRE DEL PROVEEDOR', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'CONCEPTO DEL GASTO', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'N°\nBOLETA/TIKET', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
        { content: 'SOLES', styles: { halign: 'center', fontStyle: 'bold' } }
      ]],
      body: bodyResumen,
      foot: [[
        { content: '', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: 'TOTAL GASTOS', styles: { fontStyle: 'bold', halign: 'left' } },
        { content: total, styles: { halign: 'right' } }
      ],
      [
        { content: '', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: 'FONDOS ENTREGADOS', styles: { fontStyle: 'bold', halign: 'left' } },
        { content: '400.00', styles: { halign: 'right' } }
      ],
      [
        { content: '', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: 'SALDO A FAVOR O DEVOLVER FONDOS', styles: { fontStyle: 'bold', halign: 'left', fontSize: 7 } },
        { content: (400 - grandTotal) > 0 ? (400 - grandTotal).toFixed(2) : '0.00', styles: { halign: 'right' } }
      ]],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
      footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'right' },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 60 },
        2: { cellWidth: 60 },
        3: { cellWidth: 20 },
        4: { cellWidth: 30, halign: 'right' }
      }
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Firma y Nombres y apellidos del becario', 15, y);
    y += 5;

    if (firmaData) {
      try {
        doc.addImage(firmaData, 'PNG', 15, y, 50, 15);
        y += 15;
      } catch (error) {
        console.error('Error al agregar firma en página 1:', error);
      }
    }

    doc.text('.............................................…', 15, y);
    y += 3;
    doc.text(becadoName, 15, y);

    doc.addPage();
    y = 15;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('MOVILIDAD', 15, y);
    y += 6;

    const bodyMovilidad = formData.gastosMovilidad
      .filter((g: any) => (g.monto || 0) > 0)
      .map((g: any) => [
        g.fecha,
        `${g.rutaDel} - ${g.rutaAl}`,
        (g.monto || 0).toFixed(2)
      ]);

    autoTable(doc, {
      startY: y,
      head: [[
        { content: 'FECHA', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'RUTA', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'SOLES', styles: { halign: 'center', fontStyle: 'bold' } }
      ]],
      body: bodyMovilidad,
      foot: [[
        { content: 'TOTAL', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: totalMovilidad.toFixed(2), styles: { halign: 'right', fontStyle: 'bold' } }
      ]],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
      footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 125 },
        2: { cellWidth: 30, halign: 'right' }
      }
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    if (totalOtros > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('OTRO', 15, y);
      y += 6;

      const bodyOtros = formData.otrosGastos
        .filter((g: any) => (g.monto || 0) > 0 && g.concepto)
        .map((g: any) => [
          g.fecha,
          g.concepto,
          (g.monto || 0).toFixed(2)
        ]);

      autoTable(doc, {
        startY: y,
        head: [[
          { content: 'FECHA', styles: { halign: 'center', fontStyle: 'bold' } },
          { content: 'CONCEPTO', styles: { halign: 'center', fontStyle: 'bold' } },
          { content: 'SOLES', styles: { halign: 'center', fontStyle: 'bold' } }
        ]],
        body: bodyOtros,
        foot: [[
          { content: 'TOTAL', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: totalOtros.toFixed(2), styles: { halign: 'right', fontStyle: 'bold' } }
        ]],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
        footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 125 },
          2: { cellWidth: 30, halign: 'right' }
        }
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const declaracion1 = 'Al no haber obtenido comprobante de pago que sustente este egreso, se expide la presente';
    const declaracion2 = `Declaración Jurada por el importe total de S/${total}, (${this.numberToWords(grandTotal)} soles).`;

    doc.text(declaracion1, 15, y);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text(declaracion2, 15, y);
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(lugarFirma, 15, y);
    y += 10;

    doc.text('Firma y Nombres y apellidos del becario', 105, y, { align: 'center' });
    y += 5;

    if (firmaData) {
      try {
        const firmaWidth = 60;
        const firmaHeight = 20;
        const firmaX = (210 - firmaWidth) / 2;

        doc.addImage(firmaData, 'PNG', firmaX, y, firmaWidth, firmaHeight);
        y += firmaHeight;
      } catch (error) {
        console.error('Error al agregar firma en página 2:', error);
      }
    }

    doc.text('.............................................…', 105, y, { align: 'center' });
    y += 4;
    doc.text(becadoName, 105, y, { align: 'center' });
    y += 5;
    doc.text(`DNI ${becadoDni}`, 105, y, { align: 'center' });

    const gastosConEvidencia = formData.gastosMovilidad.filter((g: any) => g.evidencia);

    if (gastosConEvidencia.length > 0) {
      doc.addPage();
      y = 15;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('EVIDENCIAS FOTOGRÁFICAS DE MOVILIDAD', 105, y, { align: 'center' });
      y += 10;

      let imageCount = 0;

      for (const gasto of gastosConEvidencia) {
        if (imageCount > 0 && imageCount % 2 === 0) {
          doc.addPage();
          y = 20;
        }

        const imgX = 15;
        const imgWidth = 180;
        const imgHeight = 100;

        try {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text(`Evidencia ${imageCount + 1}`, imgX, y);
          y += 5;

          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.rect(imgX - 2, y - 2, imgWidth + 4, imgHeight + 4);

          doc.addImage(gasto.evidencia, 'JPEG', imgX, y, imgWidth, imgHeight);
          y += imgHeight + 6;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.1);

          autoTable(doc, {
            startY: y,
            body: [
              [
                { content: 'Fecha:', styles: { fontStyle: 'bold', cellWidth: 20 } },
                gasto.fecha,
                { content: 'Monto:', styles: { fontStyle: 'bold', cellWidth: 20 } },
                `S/ ${gasto.monto.toFixed(2)}`
              ],
              [
                { content: 'Ruta:', styles: { fontStyle: 'bold', cellWidth: 20 } },
                { content: `${gasto.rutaDel} - ${gasto.rutaAl}`, colSpan: 3 }
              ]
            ],
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            margin: { left: imgX, right: imgX },
            tableWidth: imgWidth
          });

          y = (doc as any).lastAutoTable.finalY + 15;
          imageCount++;

        } catch (error) {
          console.error('Error al agregar evidencia al PDF:', error);

          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.text('⚠️ Error al cargar evidencia', imgX, y);
          y += 15;
          imageCount++;
        }
      }

      if (gastosConEvidencia.length > 6) {
        y += 10;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.text(`Total de evidencias adjuntas: ${gastosConEvidencia.length}`, 105, y, { align: 'center' });
      }
    }

    const nombreArchivo = `Rendicion_Gastos_${becadoName.replace(/\s/g, '_')}_${formData.fechaFin}.pdf`;
    doc.save(nombreArchivo);

    return doc;
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        const user: AuthUser = JSON.parse(storedUser);
        this.becado.set(user);
      } else {
        this.router.navigate(['/login']);
      }
    }
  }



  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
    this.router.navigate(['/login']);
  }
}