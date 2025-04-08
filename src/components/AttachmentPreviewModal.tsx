import { useState } from "react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface AttachmentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  fileType: string;
}

export default function AttachmentPreviewModal({
  isOpen,
  onClose,
  url,
  fileType,
}: AttachmentPreviewModalProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
  }

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.1, 2.0));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.5));

  if (fileType === "pdf") {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="flex h-[90vh] max-w-4xl flex-col p-0">
          <div className="flex h-full flex-col">
            {/* Fixed toolbar */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background p-2">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={zoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm">{(scale * 100).toFixed(0)}%</span>
                <Button variant="ghost" size="icon" onClick={zoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPageNumber(pageNumber - 1)}
                  disabled={pageNumber <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPageNumber(pageNumber + 1)}
                  disabled={pageNumber >= numPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-sm">
                Page {pageNumber} of {numPages}
              </div>
            </div>

            {/* Scrollable PDF container */}
            <div className="flex-1 overflow-auto p-4">
              <Document
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={console.error}
                className="mx-auto"
                loading={
                  <div className="flex h-full items-center justify-center">
                    <div className="text-sm text-muted-foreground">
                      Loading PDF...
                    </div>
                  </div>
                }
              >
                <div className="space-y-4">
                  {Array.from(new Array(numPages), (_, index) => (
                    <div key={`page_${index + 1}`} className="shadow-sm">
                      <Page
                        pageNumber={index + 1}
                        scale={scale}
                        width={894}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className="mx-auto"
                      />
                    </div>
                  ))}
                </div>
              </Document>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
}
