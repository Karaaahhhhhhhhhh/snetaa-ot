# Remplace l'icône de l'application par img\icone-source.png (image carrée, idéalement 1024 x 1024).
# Génère : img\icone.ico (raccourci Windows) et les icônes de l'application installable (téléphone, PWA).
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$racine = Split-Path -Parent $PSScriptRoot
$img = Join-Path $racine 'img'
$source = Join-Path $img 'icone-source.png'
if (-not (Test-Path $source)) { Write-Host 'Place ton image dans img\icone-source.png puis relance.' -ForegroundColor Red; Read-Host 'Entrée pour fermer'; exit 1 }
$src = [System.Drawing.Image]::FromFile($source)

function Redim([int]$taille, [double]$marge, [string]$fond) {
  $bmp = New-Object System.Drawing.Bitmap $taille, $taille
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  if ($fond) { $g.Clear([System.Drawing.ColorTranslator]::FromHtml($fond)) } else { $g.Clear([System.Drawing.Color]::Transparent) }
  $m = [int]($taille * $marge); $g.DrawImage($src, $m, $m, $taille - 2 * $m, $taille - 2 * $m)
  $g.Dispose(); return $bmp
}
function EnPng($bmp) { $ms = New-Object System.IO.MemoryStream; $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); return ,$ms.ToArray() }

# Icônes de l'application installable
(Redim 192 0 '#ffffff').Save((Join-Path $img 'icon-192.png'), [System.Drawing.Imaging.ImageFormat]::Png)
(Redim 512 0 '#ffffff').Save((Join-Path $img 'icon-512.png'), [System.Drawing.Imaging.ImageFormat]::Png)
(Redim 512 0.1 '#ffffff').Save((Join-Path $img 'icon-maskable-512.png'), [System.Drawing.Imaging.ImageFormat]::Png)
(Redim 180 0 '#ffffff').Save((Join-Path $img 'apple-touch-icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)

# Fichier .ico multi-tailles (images PNG intégrées, format accepté par Windows)
$tailles = 16, 24, 32, 48, 64, 128, 256
$pngs = @(); foreach ($t in $tailles) { $pngs += ,(EnPng (Redim $t 0 $null)) }
$fs = [System.IO.File]::Create((Join-Path $img 'icone.ico')); $bw = New-Object System.IO.BinaryWriter $fs
$bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]$tailles.Count)
$offset = 6 + 16 * $tailles.Count
for ($i = 0; $i -lt $tailles.Count; $i++) {
  $t = $tailles[$i]; $b = if ($t -ge 256) { 0 } else { $t }
  $bw.Write([Byte]$b); $bw.Write([Byte]$b); $bw.Write([Byte]0); $bw.Write([Byte]0)
  $bw.Write([UInt16]1); $bw.Write([UInt16]32); $bw.Write([UInt32]$pngs[$i].Length); $bw.Write([UInt32]$offset)
  $offset += $pngs[$i].Length
}
foreach ($p in $pngs) { $bw.Write($p) }
$bw.Close(); $src.Dispose()
Write-Host 'Icônes générées dans le dossier img.' -ForegroundColor Green
Write-Host 'Relance « Creer-raccourci-Windows » pour mettre à jour le raccourci.'
Write-Host '(Si l''ancienne icône reste affichée, Windows la garde en mémoire : redémarre l''ordinateur.)'
Read-Host 'Entrée pour fermer'
