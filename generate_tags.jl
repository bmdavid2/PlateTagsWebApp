
function add_extension(filepath, extension)
    # Split the path into the base name and current extension
    basename, cur_ext = splitext(filepath)
    
    # If the path already ends with the desired extension, return it as is
    if cur_ext == extension
        return filepath
    end
    
    # Otherwise, join the base name and the new extension
    return joinpath(dirname(filepath), basename * extension)
end



function generate_tags(filepath::AbstractString, tag::PlateTag,n::Integer=1)
    # n must be greater than or equal to 0
    if n < 0 
        throw(ArgumentError("number of copies (n) must be greater than 0"))
    end 
    # set up the out file path to ensure that it is a .pdf format 
    dir = dirname(filepath)
    outpath = add_extension(filepath,".pdf")
    # plot the tag 
    ENV["GKSwstype"] = "nul"
    p = plot(tag);
    tmpfile = joinpath(dir,"tmp.pdf")
    savefig(p,tmpfile)
    merge_pdfs(fill(tmpfile,n),outpath;cleanup=true)

    return outpath 

end 

