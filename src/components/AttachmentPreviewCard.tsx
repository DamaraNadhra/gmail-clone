import { useState } from "react";
import AttachmentPreviewModal from "./AttachmentPreviewModal";
import { FileText, Image as ImageIcon, File } from "lucide-react";
import { FaRegFilePdf } from "react-icons/fa6";
import { FaFileImage } from "react-icons/fa";
import { FileFormatType } from "@prisma/client";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function AttachmentCard({
  fileName,
  variant,
  mimeType,
  onClick,
  url,
}: any) {
  const [open, setOpen] = useState(false);
  const getIcon = () => {
    if (mimeType === FileFormatType.pdf)
      return <FaRegFilePdf className="text-red-500" />;
    if (mimeType === FileFormatType.image)
      return <FaFileImage className="text-blue-500" />;
    return <File />;
  };

  if (variant === "preview") {
    return (
      <>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="flex w-56 cursor-pointer items-center gap-3 truncate rounded-full border p-1 px-2 shadow-sm hover:bg-gray-50"
        >
          {getIcon()}
          <span className="w-full truncate text-sm text-gray-600">{fileName}</span>
        </div>
      </>
    );
  } else if (variant === "snippet") {
    return (
      <div
        className="relative flex h-32 w-56 cursor-pointer items-start gap-3 overflow-hidden rounded-lg border shadow-sm hover:bg-gray-50"
        onClick={onClick}
      >
        <Document file={url} loading={<div className="flex h-full items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
            }
            error={
              <div className="flex h-full items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
            }
          >
            <Page
              pageNumber={1}
              width={224}
              height={128}
          />
        </Document>
        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 truncate bg-gray-100 p-2">
          {getIcon()}
          <span className="w-full truncate text-sm text-gray-600">
            {fileName}
          </span>
        </div>
      </div>
    );
  }
}
