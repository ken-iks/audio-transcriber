export function start(stream: MediaStream): void {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
    const realAudioInput = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    realAudioInput.connect(analyser);
  
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const timeDomainData = new Uint8Array(bufferLength);
    const frequencyData = new Uint8Array(bufferLength);
  
    const canvas = document.getElementById('oscilloscope') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element with ID "oscilloscope" not found');
    }
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) {
      throw new Error('Unable to get canvas rendering context');
    }
  
    function draw(): void {
      canvasCtx!.clearRect(0, 0, canvas.width, canvas.height);
  
      // Oscilloscope logic
      canvasCtx!.lineWidth = 1;
      canvasCtx!.strokeStyle = 'rgb(255, 255, 255)';
      canvasCtx!.beginPath();
  
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
  
      analyser.getByteTimeDomainData(timeDomainData);
      for (let i = 0; i < bufferLength; i++) {
        const v = timeDomainData[i] / 128.0;
        const y = (v * canvas.height) / 2;
  
        if (i === 0) {
          canvasCtx!.moveTo(x, y);
        } else {
          canvasCtx!.lineTo(x, y);
        }
        x += sliceWidth;
      }
      canvasCtx!.lineTo(canvas.width, canvas.height / 2);
      canvasCtx!.stroke();
  
      // Frequency bars
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      x = 0;
  
      analyser.getByteFrequencyData(frequencyData);
      for (let i = 0; i < bufferLength; i++) {
        barHeight = frequencyData[i] * 2;
        canvasCtx!.fillStyle = 'rgb(220, 40, 30)';
        canvasCtx!.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight);
  
        x += barWidth + 1;
      }
  
      requestAnimationFrame(draw);
    }
  
    draw();
  }
  
  