import torch

print("="*60)
print("GPU/CPU Check")
print("="*60)

print("\nCUDA Available:", torch.cuda.is_available())

if torch.cuda.is_available():
    print("GPU Device:", torch.cuda.get_device_name(0))
    print("GPU Memory:", f"{torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")
    print("CUDA Version:", torch.version.cuda)
    print("\n✓ GPU is available - training will be fast!")
else:
    print("\n⚠ No GPU detected - training will use CPU (much slower)")
    print("Consider using GPU for faster training")

print("\n" + "="*60)

